"""
Middleware voor API Request/Response Logging
Houdt alle API calls bij voor debugging en monitoring
"""

from flask import Flask, request, g
from datetime import datetime
import json
import logging
from functools import wraps
import time
from pathlib import Path

class APILogger:
    """Log alle API requests en responses"""
    
    def __init__(self, app=None, log_file="api_calls.log"):
        self.log_file = log_file
        self.setup_logger()
        if app:
            self.init_app(app)
    
    def setup_logger(self):
        """Setup dedicated API logger"""
        self.logger = logging.getLogger('api_logger')
        self.logger.setLevel(logging.INFO)
        
        # File handler
        handler = logging.FileHandler(self.log_file)
        formatter = logging.Formatter(
            '%(asctime)s - %(levelname)s - %(message)s'
        )
        handler.setFormatter(formatter)
        self.logger.addHandler(handler)
    
    def init_app(self, app):
        """Initialize Flask middleware"""
        app.before_request(self.before_request)
        app.after_request(self.after_request)
        app.teardown_request(self.teardown_request)
    
    def before_request(self):
        """Log incoming request"""
        g.start_time = time.time()
        
        # Skip health checks
        if request.path == '/api/health':
            return
        
        log_data = {
            "timestamp": datetime.now().isoformat(),
            "method": request.method,
            "path": request.path,
            "endpoint": request.endpoint,
            "ip": request.remote_addr,
            "user_agent": request.user_agent.string
        }
        
        # Log request body if JSON
        if request.is_json:
            log_data["request_body"] = request.get_json()
        
        # Log query parameters
        if request.args:
            log_data["query_params"] = dict(request.args)
        
        g.request_log = log_data
    
    def after_request(self, response):
        """Log response"""
        if hasattr(g, 'request_log'):
            # Calculate request duration
            duration = time.time() - g.start_time
            
            g.request_log["response"] = {
                "status_code": response.status_code,
                "duration_ms": round(duration * 1000, 2)
            }
            
            # Log response body if JSON
            if response.is_json:
                try:
                    g.request_log["response_body"] = response.get_json()
                except:
                    pass
            
            # Log the complete request/response
            self.logger.info(json.dumps(g.request_log))
            
            # Check for potential issues
            self._check_for_issues(g.request_log)
        
        return response
    
    def teardown_request(self, exception=None):
        """Log any exceptions"""
        if exception:
            if hasattr(g, 'request_log'):
                g.request_log["exception"] = str(exception)
                self.logger.error(json.dumps(g.request_log))
    
    def _check_for_issues(self, log_data):
        """Detecteer potentiële problemen"""
        issues = []
        
        # Check for 404s (missing endpoints)
        if log_data["response"]["status_code"] == 404:
            issues.append(f"404 NOT FOUND: {log_data['method']} {log_data['path']}")
        
        # Check for slow requests
        if log_data["response"]["duration_ms"] > 1000:
            issues.append(f"SLOW REQUEST: {log_data['path']} took {log_data['response']['duration_ms']}ms")
        
        # Check for authentication failures
        if log_data["response"]["status_code"] == 401:
            issues.append(f"AUTH FAILURE: {log_data['path']}")
        
        # Log issues to separate file
        if issues:
            with open("api_issues.log", "a") as f:
                for issue in issues:
                    f.write(f"{datetime.now().isoformat()} - {issue}\n")


# Development helper: API Call Analyzer
class APICallAnalyzer:
    """Analyseer API logs voor patronen en problemen"""
    
    def __init__(self, log_file="api_calls.log"):
        self.log_file = log_file
    
    def analyze(self):
        """Analyseer API logs"""
        if not Path(self.log_file).exists():
            print("No API logs found")
            return
        
        calls = []
        errors = []
        
        with open(self.log_file, 'r') as f:
            for line in f:
                try:
                    # Extract JSON from log line
                    json_start = line.find('{')
                    if json_start >= 0:
                        log_entry = json.loads(line[json_start:])
                        calls.append(log_entry)
                        
                        # Collect errors
                        if log_entry.get("response", {}).get("status_code", 200) >= 400:
                            errors.append(log_entry)
                except:
                    continue
        
        # Generate report
        report = []
        report.append(f"# API Call Analysis - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        
        # Statistics
        report.append(f"## Statistics")
        report.append(f"- Total API calls: {len(calls)}")
        report.append(f"- Errors (4xx/5xx): {len(errors)}")
        
        # Endpoint usage
        endpoint_counts = {}
        for call in calls:
            endpoint = f"{call['method']} {call['path']}"
            endpoint_counts[endpoint] = endpoint_counts.get(endpoint, 0) + 1
        
        report.append(f"\n## Most Used Endpoints")
        for endpoint, count in sorted(endpoint_counts.items(), key=lambda x: x[1], reverse=True)[:10]:
            report.append(f"- {endpoint}: {count} calls")
        
        # Error summary
        if errors:
            report.append(f"\n## Errors")
            error_summary = {}
            for error in errors:
                key = f"{error['response']['status_code']} - {error['method']} {error['path']}"
                error_summary[key] = error_summary.get(key, 0) + 1
            
            for error, count in sorted(error_summary.items(), key=lambda x: x[1], reverse=True):
                report.append(f"- {error}: {count} times")
        
        # Frontend/Backend mismatches
        report.append(f"\n## Potential Issues")
        
        # Find 404s (endpoint mismatches)
        not_found = [e for e in errors if e['response']['status_code'] == 404]
        if not_found:
            report.append(f"\n### Missing Endpoints (404s)")
            unique_404s = set()
            for e in not_found:
                unique_404s.add(f"{e['method']} {e['path']}")
            for endpoint in sorted(unique_404s):
                report.append(f"- {endpoint}")
        
        # Average response times
        report.append(f"\n## Performance")
        endpoint_times = {}
        for call in calls:
            if 'response' in call and 'duration_ms' in call['response']:
                endpoint = f"{call['method']} {call['path']}"
                if endpoint not in endpoint_times:
                    endpoint_times[endpoint] = []
                endpoint_times[endpoint].append(call['response']['duration_ms'])
        
        slow_endpoints = []
        for endpoint, times in endpoint_times.items():
            avg_time = sum(times) / len(times)
            if avg_time > 500:  # Slower than 500ms
                slow_endpoints.append((endpoint, avg_time))
        
        if slow_endpoints:
            report.append(f"\n### Slow Endpoints (>500ms average)")
            for endpoint, avg_time in sorted(slow_endpoints, key=lambda x: x[1], reverse=True):
                report.append(f"- {endpoint}: {avg_time:.0f}ms average")
        
        return "\n".join(report)


# Flask integration example
"""
from api_logger import APILogger

app = Flask(__name__)
api_logger = APILogger(app)

# Of voor meer controle:
api_logger = APILogger(log_file="my_api_calls.log")
api_logger.init_app(app)
"""

# Command line analyzer
if __name__ == "__main__":
    analyzer = APICallAnalyzer()
    report = analyzer.analyze()
    print(report)
    
    with open("api_analysis_report.md", "w") as f:
        f.write(report)
    
    print("\n📄 Report saved to api_analysis_report.md")
