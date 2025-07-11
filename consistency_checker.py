#!/usr/bin/env python3
"""
Enhanced CRM Consistency Checker
Validates implementation against the API Contract Registry.
"""

import ast
import re
import yaml
from collections import defaultdict
from datetime import datetime
from pathlib import Path

class ConsistencyChecker:
    def __init__(self, project_root="."):
        self.project_root = Path(project_root)
        self.issues = defaultdict(list)
        self.contracts = self._load_contracts()

    def _load_contracts(self):
        """Loads the API contracts from the YAML file."""
        contract_file = self.project_root / "api_contracts.yaml"
        if not contract_file.exists():
            self.issues["missing_files"].append("api_contracts.yaml not found")
            return {}
        with open(contract_file, 'r') as f:
            return yaml.safe_load(f) or {}

    def _get_contract_for_route(self, method, path):
        """Finds the contract for a given method and path."""
        # Normalize path for matching, e.g., /api/users/<uuid:user_id> -> /api/users/{user_id}
        normalized_path = '/' + re.sub(r"<[^>:]+:([^>]+)>", r"{\1}", path).strip('/')
        key = f"{method.upper()} {normalized_path}"
        return self.contracts.get(key)

    def check_backend_routes(self):
        """
        Parses backend routes and validates their implementation against the API contract.
        """
        routes_dir = self.project_root / "backend" / "src" / "routes"
        if not routes_dir.exists():
            self.issues["missing_files"].append("Routes directory not found")
            return

        for route_file in routes_dir.glob("*.py"):
            if route_file.name == "__init__.py":
                continue

            with open(route_file, 'r') as f:
                content = f.read()
                try:
                    tree = ast.parse(content)
                except SyntaxError as e:
                    self.issues["syntax_errors"].append(f"Could not parse {route_file.name}: {e}")
                    continue

                # Find all function definitions (routes) in the file
                for node in ast.walk(tree):
                    if isinstance(node, ast.FunctionDef):
                        route_info = self._get_route_info_from_decorator(node)
                        if route_info:
                            method, path = route_info
                            contract = self._get_contract_for_route(method, path)
                            if not contract:
                                self.issues["unregistered_routes"].append(
                                    f"Route {method} {path} in {route_file.name} is not defined in api_contracts.yaml"
                                )
                                continue
                            
                            self._validate_route_implementation(node, contract, route_file.name)

    def _get_route_info_from_decorator(self, func_node):
        """Extracts method and path from a Flask route decorator."""
        for decorator in func_node.decorator_list:
            if isinstance(decorator, ast.Call) and hasattr(decorator.func, 'attr') and decorator.func.attr == 'route':
                path = decorator.args[0].s
                for keyword in decorator.keywords:
                    if keyword.arg == 'methods':
                        # Assuming one method per route decorator for simplicity
                        method = keyword.value.elts[0].s
                        return method, path
        return None

    def _validate_route_implementation(self, func_node, contract, filename):
        """
        Validates the fields used in a route's implementation against its contract.
        """
        # Extract all `data.get('field_name')` calls
        accessed_fields = set()
        for node in ast.walk(func_node):
            if (isinstance(node, ast.Call) and
                hasattr(node.func, 'value') and
                hasattr(node.func.value, 'id') and
                node.func.value.id == 'data' and
                hasattr(node.func, 'attr') and
                node.func.attr == 'get' and
                len(node.args) > 0 and
                isinstance(node.args[0], ast.Str)):
                accessed_fields.add(node.args[0].s)

        # Get the expected fields from the contract
        if 'properties' not in contract.get('request', {}):
            if accessed_fields:
                 self.issues["implementation_mismatch"].append(
                    f"Route {func_node.name} in {filename} accesses fields {accessed_fields} but its contract expects no request body."
                )
            return # No request properties to validate against

        expected_fields = set(contract['request']['properties'].keys())

        missing_in_impl = expected_fields - accessed_fields
        extra_in_impl = accessed_fields - expected_fields

        if extra_in_impl:
            self.issues["implementation_mismatch"].append(
                f"Route '{func_node.name}' in {filename} accesses undeclared fields: {sorted(list(extra_in_impl))}. "
                f"These must be defined in the contract."
            )
        
        # This check is optional, as not all fields need to be accessed
        # if 'required' in contract['request']:
        #     required_fields = set(contract['request']['required'])
        #     unaccessed_required = required_fields - accessed_fields
        #     if unaccessed_required:
        #         self.issues["implementation_warning"].append(
        #             f"Route '{func_node.name}' in {filename} does not access required fields: {sorted(list(unaccessed_required))}"
        #         )


    def generate_report(self):
        """Generates and prints a consistency report."""
        report_lines = [
            "# API Consistency Report",
            f"Generated: {datetime.now().isoformat()}",
            "---",
            "This report validates backend route implementations against the single source of truth: `api_contracts.yaml`.",
            ""
        ]

        if not self.contracts:
            report_lines.append("## ❌ CRITICAL: `api_contracts.yaml` is missing or empty.")
            print("\n".join(report_lines))
            return

        total_issues = sum(len(v) for v in self.issues.values())

        if total_issues == 0:
            report_lines.append("## ✅ SUCCESS: All checks passed. The implementation is consistent with the API contract.")
        else:
            report_lines.append(f"## ❌ FAILURE: Found {total_issues} consistency issues.")
            for group, problems in self.issues.items():
                if problems:
                    report_lines.append(f"\n### {group.replace('_', ' ').title()}")
                    for problem in problems:
                        report_lines.append(f"- {problem}")
        
        report_path = self.project_root / "consistency_report.md"
        with open(report_path, "w", encoding="utf-8") as f:
            f.write("\n".join(report_lines))
        
        print("\n" + "="*80)
        print("API CONSISTENCY CHECK COMPLETE")
        print(f"Report saved to {report_path}")
        print("="*80 + "\n")
        
        return total_issues == 0

    def run(self):
        """Runs all consistency checks."""
        print("Starting API consistency check...")
        self.check_backend_routes()
        return self.generate_report()


if __name__ == "__main__":
    checker = ConsistencyChecker()
    success = checker.run()
    if not success:
        print("Consistency check failed. Please review consistency_report.md")
        exit(1)
    else:
        print("Consistency check successful!")
        exit(0)