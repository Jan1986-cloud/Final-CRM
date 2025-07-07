#!/usr/bin/env python3
"""
Enhanced CRM Consistency Checker
Detecteert alle naamgevingsfouten tussen database, backend en frontend
"""

import json
import re
from collections import defaultdict
from datetime import datetime
from pathlib import Path


class ConsistencyChecker:
    def __init__(self, project_root="."):
        self.project_root = Path(project_root)
        self.issues = defaultdict(list)
        self.warnings = []
        self.stats = {
            "tables_found": 0,
            "models_found": 0,
            "routes_found": 0,
            "api_calls_found": 0,
            "warnings_found": 0,
        }

    # ------------------------------------------------------------------
    # Extraction helpers
    # ------------------------------------------------------------------
    def extract_sql_tables(self):
        """Return tables and columns from SQL schema"""
        schema_file = self.project_root / "final-crm-database-schema.sql"
        tables = {}
        if not schema_file.exists():
            self.issues["missing_files"].append("SQL schema file not found")
            return tables

        with open(schema_file) as f:
            content = f.read()

        table_pattern = r"CREATE TABLE (\w+)\s*\((.*?)\);"
        for table_name, columns in re.findall(
            table_pattern, content, re.DOTALL | re.IGNORECASE
        ):
            tables[table_name] = []
            column_pattern = r"^\s*(\w+)\s+\w+"
            for line in columns.split("\n"):
                col_match = re.match(column_pattern, line)
                if col_match and not line.strip().startswith(
                    ("PRIMARY", "FOREIGN", "CHECK", "UNIQUE")
                ):
                    tables[table_name].append(col_match.group(1))

        self.stats["tables_found"] = len(tables)
        return tables

    def extract_model_tables(self):
        models_file = self.project_root / "backend" / "src" / "models" / "database.py"
        models = {}
        if not models_file.exists():
            self.issues["missing_files"].append("Models file not found")
            return models

        with open(models_file) as f:
            content = f.read()

        class_pattern = r"class (\w+)\(db\.Model\):(.*?)(?=class|$)"
        for class_name, class_body in re.findall(class_pattern, content, re.DOTALL):
            table_match = re.search(
                r"__tablename__\s*=\s*[\"']([^\"']+)[\"']", class_body
            )
            if table_match:
                table_name = table_match.group(1)
                column_pattern = r"(\w+)\s*=\s*db\.Column"
                columns = re.findall(column_pattern, class_body)
                models[class_name] = {"table": table_name, "fields": columns}

        self.stats["models_found"] = len(models)
        return models

    def extract_backend_routes(self):
        routes_dir = self.project_root / "backend" / "src" / "routes"
        all_routes = []
        if not routes_dir.exists():
            self.issues["missing_files"].append("Routes directory not found")
            return all_routes

        for route_file in routes_dir.glob("*.py"):
            if route_file.name == "__init__.py":
                continue
            with open(route_file) as f:
                content = f.read()

            bp_match = re.search(r"(\w+)\s*=\s*Blueprint\([\"']([^\"']+)[\"']", content)
            if not bp_match:
                continue
            bp_var = bp_match.group(1)
            bp_name = bp_match.group(2)
            pattern = rf"@{bp_var}\.route\([\"']([^\"']+)[\"'].*?methods=\[([^\]]+)\]"
            for path, methods in re.findall(pattern, content):
                methods_clean = [m.strip().strip("\"'") for m in methods.split(",")]
                all_routes.append(
                    {"blueprint": bp_name, "path": path, "methods": methods_clean}
                )

        self.stats["routes_found"] = len(all_routes)
        return all_routes

    def extract_frontend_api_calls(self):
        api_file = self.project_root / "frontend" / "src" / "services" / "api.js"
        endpoints = []
        if not api_file.exists():
            self.issues["missing_files"].append("api.js not found")
            return endpoints

        with open(api_file) as f:
            content = f.read()

        pattern = r"api\.(get|post|put|patch|delete)\([\"'](/[^\"']+)[\"']"
        for method, url in re.findall(pattern, content):
            endpoints.append({"method": method.upper(), "url": url})

        self.stats["api_calls_found"] = len(endpoints)
        return endpoints

    # ------------------------------------------------------------------
    # Consistency checks
    # ------------------------------------------------------------------
    def check_db_model_consistency(self, tables, models):
        for table_name, columns in tables.items():
            found = False
            for model in models.values():
                if model["table"] == table_name:
                    found = True
                    model_cols = set(model["fields"])
                    sql_cols = set(columns)
                    missing = sql_cols - model_cols
                    extra = model_cols - sql_cols
                    if missing:
                        self.issues["missing_model_fields"].append(
                            f"Table '{table_name}': columns missing in model: {sorted(missing)}"
                        )
                    if extra:
                        self.issues["extra_model_fields"].append(
                            f"Table '{table_name}': extra fields in model: {sorted(extra)}"
                        )
            if not found:
                self.issues["missing_models"].append(
                    f"Model for table '{table_name}' not found"
                )

    def check_model_route_consistency(self, models, routes):
        model_tables = {m["table"] for m in models.values()}
        valid = set(model_tables)
        valid.update({"auth", "excel", "documents"})
        for route in routes:
            blueprint = route.get("blueprint")
            if not blueprint:
                continue
            # Accept if direct match or simple pluralization
            if (
                blueprint in valid
                or f"{blueprint}s" in model_tables
                or (blueprint.endswith("s") and blueprint[:-1] in model_tables)
            ):
                continue
            self.issues["route_model_mismatch"].append(
                f"Blueprint '{blueprint}' has no matching model table"
            )

    def check_route_api_consistency(self, routes, api_calls):
        for call in api_calls:
            found = False
            for route in routes:
                if (
                    self._match_route(call["url"], route["path"])
                    and call["method"] in route["methods"]
                ):
                    found = True
                    break
            if not found:
                self.issues["missing_routes"].append(
                    f"Frontend calls {call['method']} {call['url']} but no matching route"
                )

    def check_naming_conventions(self, tables, models, routes, api_calls):
        for call in api_calls:
            if "_" in call["url"]:
                self.warnings.append(
                    f"Endpoint {call['url']} uses underscore; consider using dashes"
                )

    # ------------------------------------------------------------------
    # Utility
    # ------------------------------------------------------------------
    def _match_route(self, frontend_path, backend_path):
        raw = re.sub(r"\$\{(\w+)\}", r"<\1>", frontend_path)
        raw = raw.lstrip("/")
        parts = raw.split("/", 1)
        tail = parts[1] if len(parts) > 1 else ""
        return tail.strip("/") == backend_path.strip("/")

    def generate_report(self):
        report_lines = []
        report_lines.append("CRM Consistency Report")
        report_lines.append("=" * 40)
        report_lines.append(f"Generated: {datetime.now().isoformat()}")
        report_lines.append("")
        for key, value in self.stats.items():
            report_lines.append(f"{key}: {value}")
        report_lines.append("")

        if self.warnings:
            report_lines.append("## warnings")
            for warning in self.warnings:
                report_lines.append(f"- {warning}")
            report_lines.append("")

        total = sum(len(v) for v in self.issues.values())
        report_lines.append(f"Total issues: {total}")
        for group, problems in self.issues.items():
            if problems:
                report_lines.append(f"\n## {group}")
                for problem in problems:
                    report_lines.append(f"- {problem}")

        report_path = self.project_root / "consistency_report.md"
        with open(report_path, "w") as f:
            f.write("\n".join(report_lines))
        print(f"Report saved to {report_path}")

    def run(self):
        tables = self.extract_sql_tables()
        models = self.extract_model_tables()
        routes = self.extract_backend_routes()
        api_calls = self.extract_frontend_api_calls()

        self.check_db_model_consistency(tables, models)
        self.check_model_route_consistency(models, routes)
        self.check_route_api_consistency(routes, api_calls)
        self.check_naming_conventions(tables, models, routes, api_calls)
        self.stats["warnings_found"] = len(self.warnings)
        self.generate_report()

        return not any(self.issues.values())


if __name__ == "__main__":
    checker = ConsistencyChecker()
    success = checker.run()
    if not success:
        exit(1)
