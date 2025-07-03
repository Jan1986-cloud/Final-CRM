#!/usr/bin/env python3
"""
CRM Consistency Checker
Detecteert naamgevingsinconsistenties tussen database schema, backend models en frontend code
"""

import re
import json
from pathlib import Path
from collections import defaultdict

class ConsistencyChecker:
    def __init__(self, project_root):
        self.project_root = Path(project_root)
        self.issues = defaultdict(list)
        
    def extract_sql_tables(self):
        """Extract table and column names from SQL schema"""
        schema_file = self.project_root / "final-crm-database-schema.sql"
        tables = {}
        
        with open(schema_file, 'r') as f:
            content = f.read()
            
        # Find CREATE TABLE statements
        table_pattern = r'CREATE TABLE (\w+)\s*\((.*?)\);'
        matches = re.findall(table_pattern, content, re.DOTALL | re.IGNORECASE)
        
        for table_name, columns in matches:
            tables[table_name] = []
            # Extract column names
            column_pattern = r'^\s*(\w+)\s+\w+'
            for line in columns.split('\n'):
                col_match = re.match(column_pattern, line)
                if col_match and not line.strip().startswith(('PRIMARY', 'FOREIGN', 'CHECK', 'UNIQUE')):
                    tables[table_name].append(col_match.group(1))
                    
        return tables
    
    def extract_model_tables(self):
        """Extract model table names and fields from SQLAlchemy models"""
        models_file = self.project_root / "final-crm-backend" / "src" / "models" / "database.py"
        models = {}
        
        with open(models_file, 'r') as f:
            content = f.read()
            
        # Find model classes and their table names
        class_pattern = r'class (\w+)\(db\.Model\):(.*?)(?=class|\Z)'
        matches = re.findall(class_pattern, content, re.DOTALL)
        
        for class_name, class_body in matches:
            # Find tablename
            tablename_match = re.search(r"__tablename__\s*=\s*['\"](\w+)['\"]", class_body)
            if tablename_match:
                table_name = tablename_match.group(1)
                models[table_name] = {
                    'class_name': class_name,
                    'columns': []
                }
                
                # Find column definitions
                column_pattern = r'(\w+)\s*=\s*db\.Column'
                for col_match in re.finditer(column_pattern, class_body):
                    col_name = col_match.group(1)
                    if col_name not in ['__tablename__', '__table_args__']:
                        models[table_name]['columns'].append(col_name)
                        
        return models
    
    def extract_api_endpoints(self):
        """Extract API endpoints from frontend code"""
        api_file = self.project_root / "final-crm-frontend" / "src" / "services" / "api.js"
        endpoints = defaultdict(list)
        
        with open(api_file, 'r') as f:
            content = f.read()
            
        # Find API endpoint definitions
        endpoint_pattern = r"api\.(get|post|put|patch|delete)\(['\"`](/[\w\-/\$\{\}]+)['\"`]"
        matches = re.findall(endpoint_pattern, content)
        
        for method, endpoint in matches:
            # Clean up endpoint
            clean_endpoint = re.sub(r'\$\{[^}]+\}', '*', endpoint)
            endpoints[clean_endpoint].append(method)
            
        return endpoints
    
    def extract_backend_routes(self):
        """Extract route definitions from Flask backend"""
        routes = defaultdict(list)
        routes_dir = self.project_root / "final-crm-backend" / "src" / "routes"
        
        for route_file in routes_dir.glob("*.py"):
            if route_file.name == "__init__.py":
                continue
                
            with open(route_file, 'r') as f:
                content = f.read()
                
            # Find route decorators
            route_pattern = r"@\w+\.route\(['\"]([^'\"]+)['\"].*?methods=\[([^\]]+)\]"
            matches = re.findall(route_pattern, content)
            
            for route, methods in matches:
                # Extract blueprint name
                bp_match = re.search(r"(\w+)_bp\s*=\s*Blueprint\(['\"](\w+)['\"]", content)
                if bp_match:
                    bp_name = bp_match.group(2)
                    full_route = f"/{bp_name}{route}"
                    routes[full_route].extend([m.strip().strip("'\"") for m in methods.split(',')])
                    
        return routes
    
    def check_consistency(self):
        """Run all consistency checks"""
        print("🔍 Extracting database schema...")
        sql_tables = self.extract_sql_tables()
        
        print("🔍 Extracting model definitions...")
        model_tables = self.extract_model_tables()
        
        print("🔍 Extracting API endpoints...")
        api_endpoints = self.extract_api_endpoints()
        
        print("🔍 Extracting backend routes...")
        backend_routes = self.extract_backend_routes()
        
        # Check SQL vs Models
        print("\n📊 Checking SQL schema vs Models...")
        for sql_table in sql_tables:
            if sql_table not in model_tables:
                self.issues['missing_models'].append(f"Table '{sql_table}' has no corresponding model")
            else:
                model_cols = set(model_tables[sql_table]['columns'])
                sql_cols = set(sql_tables[sql_table])
                
                missing_in_model = sql_cols - model_cols
                extra_in_model = model_cols - sql_cols
                
                if missing_in_model:
                    self.issues['missing_columns'].append(
                        f"Table '{sql_table}': Columns in SQL but not in model: {missing_in_model}"
                    )
                if extra_in_model:
                    self.issues['extra_columns'].append(
                        f"Table '{sql_table}': Columns in model but not in SQL: {extra_in_model}"
                    )
        
        # Check for table name mismatches
        for model_table, info in model_tables.items():
            if model_table not in sql_tables:
                self.issues['table_mismatch'].append(
                    f"Model '{info['class_name']}' uses table '{model_table}' which doesn't exist in SQL"
                )
        
        # Check API endpoints vs Backend routes
        print("\n🌐 Checking Frontend API vs Backend routes...")
        for endpoint in api_endpoints:
            # Normalize endpoint for comparison
            normalized = endpoint.replace('/*', '').replace('/api', '')
            found = False
            
            for route in backend_routes:
                if normalized in route or route in normalized:
                    found = True
                    break
                    
            if not found:
                self.issues['missing_routes'].append(f"Frontend calls '{endpoint}' but no matching backend route")
        
        return self.issues
    
    def generate_report(self):
        """Generate a detailed report of all issues"""
        issues = self.check_consistency()
        
        report = ["# CRM Consistency Check Report\n"]
        report.append(f"Total issues found: {sum(len(v) for v in issues.values())}\n")
        
        issue_types = {
            'missing_models': '🔴 Missing Models',
            'table_mismatch': '🔴 Table Name Mismatches',
            'missing_columns': '🟡 Missing Columns',
            'extra_columns': '🟡 Extra Columns',
            'missing_routes': '🟠 Missing Backend Routes'
        }
        
        for issue_type, title in issue_types.items():
            if issues[issue_type]:
                report.append(f"\n## {title}\n")
                for issue in issues[issue_type]:
                    report.append(f"- {issue}")
        
        # Generate fix suggestions
        report.append("\n## 🛠️ Suggested Fixes\n")
        
        if issues['table_mismatch']:
            report.append("### Table Name Fixes")
            report.append("```python")
            for issue in issues['table_mismatch']:
                if 'invoice_items' in issue:
                    report.append("# Change InvoiceItem model:")
                    report.append("__tablename__ = 'invoice_lines'  # Match SQL schema")
                elif 'work_order_time_entries' in issue:
                    report.append("# Change WorkOrderTimeEntry model:")
                    report.append("__tablename__ = 'time_registrations'  # Match SQL schema")
            report.append("```\n")
        
        return '\n'.join(report)
    
    def save_report(self, filename="consistency_report.md"):
        """Save the report to a file"""
        report = self.generate_report()
        report_path = self.project_root / filename
        
        with open(report_path, 'w') as f:
            f.write(report)
            
        print(f"\n✅ Report saved to: {report_path}")
        print("\nSummary:")
        for issue_type, issues_list in self.issues.items():
            if issues_list:
                print(f"  - {issue_type}: {len(issues_list)} issues")


if __name__ == "__main__":
    # Run consistency check
    checker = ConsistencyChecker(".")
    checker.save_report()
    
    # Also create a JSON report for programmatic use
    issues_json = checker.issues
    with open("consistency_issues.json", "w") as f:
        json.dump(dict(issues_json), f, indent=2)
    
    print("\n📄 JSON report saved to: consistency_issues.json")
