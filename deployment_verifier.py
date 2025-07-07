#!/usr/bin/env python3
"""
CRM Deployment Verificatie Script
Controleert of alles klaar is voor deployment
"""

import os
import sys
import json
import subprocess
from pathlib import Path
from datetime import datetime


class DeploymentVerifier:
    def __init__(self):
        self.issues = []
        self.warnings = []
        self.project_root = Path.cwd()

    def check_file_exists(self, filepath, critical=True):
        """Check if a required file exists"""
        full_path = self.project_root / filepath
        if not full_path.exists():
            msg = f"Missing file: {filepath}"
            if critical:
                self.issues.append(msg)
            else:
                self.warnings.append(msg)
            return False
        return True

    def check_environment_files(self):
        """Check for environment configuration files"""
        print("🔍 Checking environment files...")

        self.check_file_exists("backend/.env", critical=False)
        self.check_file_exists("backend/.env.example")
        self.check_file_exists("frontend/.env", critical=False)
        self.check_file_exists("frontend/.env.production", critical=False)

        if (self.project_root / "backend/.env").exists():
            with open(self.project_root / "backend/.env") as f:
                env_content = f.read()
                required_vars = ["DATABASE_URL", "JWT_SECRET_KEY", "SECRET_KEY"]
                for var in required_vars:
                    if var not in env_content:
                        self.issues.append(f"Missing environment variable: {var}")

        if (self.project_root / ".env").exists():
            with open(self.project_root / ".env") as f:
                env_content = f.read()
                if "your-secret-key-here" in env_content:
                    self.warnings.append(
                        "Default secret keys still in .env - CHANGE BEFORE DEPLOYMENT!"
                    )

    def check_dependencies(self):
        """Check if all dependencies are properly listed"""
        print("🔍 Checking dependencies...")

        if self.check_file_exists("backend/requirements.txt"):
            with open(self.project_root / "backend/requirements.txt") as f:
                requirements = f.read()
                essential_packages = [
                    "flask",
                    "flask-sqlalchemy",
                    "flask-jwt-extended",
                    "flask-cors",
                    "python-dotenv",
                    "gunicorn",
                ]
                for package in essential_packages:
                    if package not in requirements.lower():
                        self.warnings.append(
                            f"Package '{package}' might be missing from requirements.txt"
                        )

        if self.check_file_exists("frontend/package.json"):
            with open(self.project_root / "frontend/package.json") as f:
                package_data = json.load(f)
                deps = package_data.get("dependencies", {})
                essential_packages = ["react", "react-dom", "axios", "react-router-dom"]
                for package in essential_packages:
                    if package not in deps:
                        self.issues.append(
                            f"Package '{package}' missing from package.json"
                        )

    def check_database(self):
        """Check database configuration"""
        print("🔍 Checking database setup...")

        self.check_file_exists("final-crm-database-schema.sql")

        migrations_dir = self.project_root / "backend/migrations"
        if not migrations_dir.exists():
            self.warnings.append(
                "No migrations directory found. Run 'flask db init' if using migrations"
            )

    def check_routes_configuration(self):
        """Check if routes are properly configured"""
        print("🔍 Checking routes configuration...")

        init_file = self.project_root / "backend/src/routes/__init__.py"
        if init_file.exists():
            with open(init_file) as f:
                content = f.read()
                if len(content.strip()) < 100:
                    self.issues.append("routes/__init__.py seems empty or incomplete")

        main_locations = [
            "backend/src/main.py",
            "backend/app.py",
            "backend/main.py",
        ]

        main_found = False
        for location in main_locations:
            if (self.project_root / location).exists():
                main_found = True
                with open(self.project_root / location) as f:
                    content = f.read()
                    if "register_blueprint" not in content:
                        self.issues.append(
                            f"{location} doesn't register any blueprints"
                        )
                break

        if not main_found:
            self.issues.append("No main application file (app.py/main.py) found")

    def check_cors_configuration(self):
        """Check CORS is properly configured"""
        print("🔍 Checking CORS configuration...")

        main_locations = [
            "backend/src/main.py",
            "backend/app.py",
            "backend/main.py",
        ]

        cors_found = False
        for location in main_locations:
            if (self.project_root / location).exists():
                with open(self.project_root / location) as f:
                    content = f.read()
                    if "CORS" in content or "cors" in content:
                        cors_found = True
                        break

        if not cors_found:
            self.issues.append("CORS not configured in backend app")

    def check_docker_setup(self):
        """Check Docker configuration"""
        print("🔍 Checking Docker setup...")

        if not self.check_file_exists("docker-compose.yml", critical=False):
            self.warnings.append("No docker-compose.yml found")

        if not self.check_file_exists("backend/Dockerfile", critical=False):
            self.warnings.append("No Dockerfile found for backend")

        if not self.check_file_exists("frontend/Dockerfile", critical=False):
            self.warnings.append("No Dockerfile found for frontend")

        if (self.project_root / "frontend/Dockerfile").exists():
            if not self.check_file_exists("frontend/nginx.conf", critical=False):
                self.warnings.append(
                    "No nginx.conf found for frontend Docker deployment"
                )

    def check_security(self):
        """Check basic security configurations"""
        print("🔍 Checking security settings...")

        gitignore = self.project_root / ".gitignore"
        if gitignore.exists():
            with open(gitignore) as f:
                gitignore_content = f.read()
                if ".env" not in gitignore_content:
                    self.issues.append(".env not in .gitignore - SECURITY RISK!")
        else:
            self.issues.append("No .gitignore file found - SECURITY RISK!")

        if (self.project_root / "backend/src/main.py").exists():
            with open(self.project_root / "backend/src/main.py") as f:
                content = f.read()
                if "debug=True" in content and "if __name__" in content:
                    self.warnings.append(
                        "Debug mode is True in main.py - disable for production!"
                    )

    def run_consistency_check(self):
        """Run the consistency checker if it exists"""
        print("🔍 Running consistency checker...")

        checker_path = self.project_root / "consistency_checker.py"
        if checker_path.exists():
            try:
                result = subprocess.run(
                    [sys.executable, str(checker_path)], capture_output=True, text=True
                )
                if result.returncode != 0:
                    self.issues.append("Consistency checker found issues")
                    if result.stdout:
                        self.warnings.append(
                            f"Consistency output: {result.stdout[:200]}..."
                        )
            except Exception as e:
                self.warnings.append(f"Could not run consistency checker: {e}")

    def _generate_text_report(self, score):
        report = []
        report.append("DEPLOYMENT READINESS REPORT")
        report.append("=" * 60)
        report.append(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        report.append(f"Project: {self.project_root}")
        report.append(f"Readiness Score: {score}/100")
        report.append("")

        if self.issues:
            report.append(f"CRITICAL ISSUES ({len(self.issues)}):")
            for issue in self.issues:
                report.append(f"  - {issue}")
            report.append("")

        if self.warnings:
            report.append(f"WARNINGS ({len(self.warnings)}):")
            for warning in self.warnings:
                report.append(f"  - {warning}")
            report.append("")

        report.append("RECOMMENDATIONS:")
        if score < 50:
            report.append("  - Fix all critical issues before attempting deployment")
        elif score < 80:
            report.append("  - Address critical issues and review warnings")
        else:
            report.append("  - Review warnings and complete deployment checklist")

        return "\n".join(report)

    def generate_report(self):
        print("\n" + "=" * 60)
        print("🚀 DEPLOYMENT READINESS REPORT")
        print("=" * 60)
        print(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"Project: {self.project_root}")
        print()

        total_score = 100
        if self.issues:
            total_score -= len(self.issues) * 10
        if self.warnings:
            total_score -= len(self.warnings) * 3
        total_score = max(0, total_score)

        print(f"📊 Readiness Score: {total_score}/100")
        print()

        if not self.issues and not self.warnings:
            print("✅ ALL CHECKS PASSED! Your project is ready for deployment.")
        else:
            if self.issues:
                print(f"❌ CRITICAL ISSUES ({len(self.issues)}):")
                for issue in self.issues:
                    print(f"   • {issue}")
                print()

            if self.warnings:
                print(f"⚠️  WARNINGS ({len(self.warnings)}):")
                for warning in self.warnings:
                    print(f"   • {warning}")
                print()

        print("📋 DEPLOYMENT CHECKLIST:")
        checklist = [
            "Update all environment variables for production",
            "Change all secret keys from default values",
            "Set DEBUG=False in production",
            "Configure proper database (PostgreSQL) for production",
            "Set up SSL certificates (HTTPS)",
            "Configure domain names and DNS",
            "Set up monitoring and error tracking",
            "Create database backup strategy",
            "Test all API endpoints with production config",
            "Build frontend for production (npm run build)",
            "Configure CDN for static assets (optional)",
            "Set up CI/CD pipeline",
            "Document deployment process",
        ]

        for item in checklist:
            print(f"   ☐ {item}")

        print("\n" + "=" * 60)

        report_file = (
            self.project_root
            / f"deployment_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
        )
        with open(report_file, "w") as f:
            f.write(self._generate_text_report(total_score))
        print(f"\n📄 Report saved to: {report_file}")

        return total_score

    def verify(self):
        print("🚀 Starting deployment verification...\n")

        self.check_environment_files()
        self.check_dependencies()
        self.check_database()
        self.check_routes_configuration()
        self.check_cors_configuration()
        self.check_docker_setup()
        self.check_security()
        self.run_consistency_check()

        score = self.generate_report()

        if score >= 80:
            print("\n✅ Your application is ready for deployment!")
        elif score >= 50:
            print("\n⚠️  Fix critical issues before deploying.")
        else:
            print("\n❌ Application is not ready for deployment.")


if __name__ == "__main__":
    verifier = DeploymentVerifier()
    verifier.verify()
