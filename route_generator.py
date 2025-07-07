#!/usr/bin/env python3
"""
CRM Route Generator & Consistency Fixer
Genereert ontbrekende routes en fixt naming inconsistenties
"""

import os
import re
import json
from pathlib import Path
from datetime import datetime


class RouteGenerator:
    def __init__(self, project_root):
        self.project_root = Path(project_root)
        self.backend_root = self.project_root / "backend"
        self.frontend_root = self.project_root / "frontend"

    def analyze_frontend_api_calls(self):
        """Extract all API calls from frontend"""
        api_file = self.frontend_root / "src" / "services" / "api.js"

        if not api_file.exists():
            return []

        with open(api_file, "r") as f:
            content = f.read()

        endpoints = []
        service_pattern = r"export const (\w+)Service = \{([^}]+)\}"
        services = re.findall(service_pattern, content, re.DOTALL)

        for service_name, service_body in services:
            method_pattern = r"(\w+):\s*\([^)]*\)\s*=>\s*api\.(\w+)\((.*?)\)"
            methods = re.findall(method_pattern, service_body, re.DOTALL)

            for method_name, http_method, args in methods:
                url_pattern = r"[\"']([^\"']+)[\"']"
                urls = re.findall(url_pattern, args)
                if urls:
                    endpoint = {
                        "service": service_name,
                        "method": method_name,
                        "http_method": http_method.upper(),
                        "url": urls[0],
                        "full_path": f"/api{urls[0]}",
                    }
                    endpoints.append(endpoint)

        return endpoints

    def analyze_backend_routes(self):
        """Extract all routes from backend"""
        routes_dir = self.backend_root / "src" / "routes"
        backend_routes = {}

        if not routes_dir.exists():
            return backend_routes

        for route_file in routes_dir.glob("*.py"):
            if route_file.name == "__init__.py":
                continue

            with open(route_file, "r") as f:
                content = f.read()

            bp_pattern = r"(\w+)\s*=\s*Blueprint\([\"'](\w+)[\"']"
            bp_match = re.search(bp_pattern, content)
            if not bp_match:
                continue

            bp_var_name = bp_match.group(1)
            bp_name = bp_match.group(2)

            route_pattern = (
                r"@"
                + bp_var_name
                + r"\.route\([\"']([^\"']+)[\"']\s*,\s*methods=\[([^\]]+)\]"
            )
            routes = re.findall(route_pattern, content)

            backend_routes[bp_name] = []
            for route, methods in routes:
                method_list = [m.strip().strip("\"'") for m in methods.split(",")]
                backend_routes[bp_name].append(
                    {
                        "path": route,
                        "methods": method_list,
                        "file": route_file.name,
                    }
                )

        return backend_routes

    def check_blueprint_registration(self):
        """Check how blueprints are registered"""
        main_file = self.backend_root / "src" / "main.py"

        if not main_file.exists():
            return {}

        with open(main_file, "r") as f:
            content = f.read()

        registrations = {}
        reg_pattern = (
            r"app\.register_blueprint\((\w+),\s*url_prefix=[\"']([^\"']+)[\"']"
        )
        matches = re.findall(reg_pattern, content)

        for bp_name, prefix in matches:
            registrations[bp_name] = prefix

        return registrations

    def _match_route(self, frontend_path, backend_path):
        frontend_normalized = re.sub(r"\$\{(\w+)\}", r"<\1>", frontend_path)
        frontend_normalized = frontend_normalized.lstrip("/").replace("-", "_")
        backend_normalized = backend_path.lstrip("/").replace("-", "_")
        return frontend_normalized == backend_normalized

    def generate_report(self):
        """Generate a comprehensive report of all route issues"""
        print("🔍 Analyzing CRM Routes...\n")

        frontend_endpoints = self.analyze_frontend_api_calls()
        backend_routes = self.analyze_backend_routes()
        registrations = self.check_blueprint_registration()

        print(f"📊 Found {len(frontend_endpoints)} frontend endpoints")
        print(
            f"📊 Found {sum(len(routes) for routes in backend_routes.values())} backend routes"
        )
        print(f"📊 Found {len(registrations)} blueprint registrations\n")

        issues = []
        print("🔍 Checking for route mismatches...\n")

        for endpoint in frontend_endpoints:
            frontend_path = endpoint["url"]
            service = endpoint["service"]

            service_to_bp = {
                "workOrder": "work_orders",
                "customer": "customers",
                "article": "articles",
                "quote": "quotes",
                "invoice": "invoices",
                "document": "documents",
                "excel": "excel",
                "company": "companies",
                "auth": "auth",
            }

            bp_name = service_to_bp.get(service, service)

            if bp_name + "_bp" in registrations:
                registered_prefix = registrations[bp_name + "_bp"]
                expected_prefix = f"/api/{bp_name.replace('_', '-')}"

                if registered_prefix not in (
                    expected_prefix,
                    f"/api/{bp_name}",
                ):
                    issues.append(
                        {
                            "type": "registration_mismatch",
                            "blueprint": bp_name,
                            "registered": registered_prefix,
                            "frontend_expects": frontend_path,
                        }
                    )

            found = False
            if bp_name in backend_routes:
                for route in backend_routes[bp_name]:
                    if (
                        self._match_route(frontend_path, route["path"])
                        and endpoint["http_method"] in route["methods"]
                    ):
                        found = True
                        break

            if not found:
                issues.append(
                    {
                        "type": "missing_route",
                        "service": service,
                        "method": endpoint["method"],
                        "http_method": endpoint["http_method"],
                        "frontend_path": frontend_path,
                        "blueprint": bp_name,
                    }
                )

        if issues:
            print(f"❌ Found {len(issues)} issues:\n")
            for issue in issues:
                if issue["type"] == "missing_route":
                    print(
                        f"  • Missing: {issue['http_method']} {issue['frontend_path']} in {issue['blueprint']}"
                    )
                elif issue["type"] == "registration_mismatch":
                    print(
                        f"  • Mismatch: {issue['blueprint']} registered as {issue['registered']} but frontend expects {issue['frontend_expects']}"
                    )
        else:
            print("✅ All routes are properly configured!")

        return issues

    def generate_fix_script(self, issues):
        """Generate a script to fix all issues"""
        if not issues:
            print("\n✅ No fixes needed!")
            return

        print("\n📝 Generating fix script...")

        fixes = [
            "#!/usr/bin/env python3",
            "# Auto-generated fix script for CRM routing issues",
            f"# Generated on: {datetime.now().isoformat()}\n",
            "import re",
            "from pathlib import Path\n",
        ]

        registration_fixes = []
        frontend_fixes = []

        for issue in issues:
            if issue["type"] == "registration_mismatch":
                registration_fixes.append(issue)
            elif issue["type"] == "missing_route":
                frontend_fixes.append(issue)

        if registration_fixes:
            fixes.append("def fix_blueprint_registrations():")
            fixes.append("    '''Fix blueprint registration mismatches'''")
            fixes.append("    main_file = Path('backend/src/main.py')")
            fixes.append("    with open(main_file, 'r') as f:")
            fixes.append("        content = f.read()")
            fixes.append("")

            for fix in registration_fixes:
                old = f"{fix['registered']}"
                new = f"/api/{fix['blueprint']}"
                fixes.append(f"    # Fix {fix['blueprint']} registration")
                fixes.append(f"    content = content.replace('{old}', '{new}')")
                fixes.append("")

            fixes.append("    with open(main_file, 'w') as f:")
            fixes.append("        f.write(content)")
            fixes.append("    print('✅ Fixed blueprint registrations')\n")

        if frontend_fixes:
            fixes.append("def report_missing_routes():")
            fixes.append("    '''Report missing routes that need to be implemented'''")
            fixes.append("    print('\n⚠️  Missing routes that need implementation:')")
            for fix in frontend_fixes:
                fixes.append(
                    f"    print('  - {fix['http_method']} {fix['frontend_path']} in {fix['blueprint']}.py')"
                )
            fixes.append("")

        fixes.append("if __name__ == '__main__':")
        fixes.append("    print('🔧 Applying routing fixes...\n')")
        if registration_fixes:
            fixes.append("    fix_blueprint_registrations()")
        if frontend_fixes:
            fixes.append("    report_missing_routes()")
        fixes.append("    print('\n✨ Done!')")

        fix_script_path = self.project_root / "fix_routes_auto.py"
        with open(fix_script_path, "w") as f:
            f.write("\n".join(fixes))

        print("✅ Fix script saved to: fix_routes_auto.py")
        print("   Run: python fix_routes_auto.py")


if __name__ == "__main__":
    import sys

    project_root = sys.argv[1] if len(sys.argv) > 1 else "."

    generator = RouteGenerator(project_root)
    issues = generator.generate_report()

    if issues:
        generator.generate_fix_script(issues)
