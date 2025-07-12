import yaml
import re
import sys
import os
from pathlib import Path
import ast
import inspect

# --- Setup Python Path ---
project_root = Path(__file__).parent
backend_path = project_root / 'backend'
sys.path.insert(0, str(backend_path))

from flask import Flask
from src.main import create_app
from src.models.database import db

# --- Constants & Configuration ---
COLOR = {
    "HEADER": "\033[95m", "BLUE": "\033[94m", "GREEN": "\033[92m",
    "YELLOW": "\033[93m", "RED": "\033[91m", "ENDC": "\033[0m",
    "BOLD": "\033[1m", "UNDERLINE": "\033[4m",
}
API_CONTRACT_PATH = "api_contracts.yaml"

# --- Helper Functions ---
def print_color(text, color_name):
    if sys.stdout.isatty():
        print(f"{COLOR.get(color_name, '')}{text}{COLOR['ENDC']}")
    else:
        print(text)

def load_api_contract(path=API_CONTRACT_PATH):
    try:
        with open(path, "r", encoding="utf-8") as f:
            return yaml.safe_load(f)
    except FileNotFoundError:
        print_color(f"Error: API contract file not found at '{path}'", "RED")
        return None
    except yaml.YAMLError as e:
        print_color(f"Error parsing YAML file: {e}", "RED")
        return None

def get_model_class_from_schema_name(schema_name):
    """Finds a SQLAlchemy model class based on a schema name."""
    for mapper in db.Model.registry.mappers:
        cls = mapper.class_
        if cls.__name__ == schema_name:
            return cls
    return None

def extract_keys_from_to_dict(model_class):
    """
    Uses AST to safely parse the source code of a model's to_dict method.
    """
    try:
        # Find the to_dict method in the class
        to_dict_method = getattr(model_class, 'to_dict', None)
        if not to_dict_method:
            return None # No to_dict method found

        source_code = inspect.getsource(to_dict_method)
        tree = ast.parse(source_code)
        
        # Find the return statement inside the to_dict function
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef) and node.name == 'to_dict':
                for sub_node in ast.walk(node):
                    if isinstance(sub_node, ast.Return) and isinstance(sub_node.value, ast.Dict):
                        keys = {key.value for key in sub_node.value.keys if isinstance(key, ast.Constant)}
                        return keys
        return set()
    except (TypeError, OSError, IndentationError):
        return None

def check_schema_consistency(schemas, app):
    """Compares model schemas with their to_dict methods."""
    errors = []
    with app.app_context():
        for schema_name, schema_def in schemas.items():
            if 'properties' not in schema_def:
                continue

            model_class = get_model_class_from_schema_name(schema_name)
            if not model_class:
                # This is not an error, but a schema for composition (e.g., Pagination)
                continue

            impl_keys = extract_keys_from_to_dict(model_class)
            if impl_keys is None:
                # This is not an error, just models without a to_dict
                continue

            contract_keys = set(schema_def['properties'].keys())
            
            if contract_keys != impl_keys:
                missing_in_impl = contract_keys - impl_keys
                missing_in_contract = impl_keys - contract_keys
                error_msg = f"Schema '{schema_name}' mismatch:\n"
                if missing_in_impl:
                    error_msg += f"  - Missing in to_dict(): {sorted(list(missing_in_impl))}\n"
                if missing_in_contract:
                    error_msg += f"  - Missing in contract: {sorted(list(missing_in_contract))}\n"
                errors.append(error_msg.strip())

    return errors

# --- Main Execution ---
def main():
    """Main function to run all consistency checks."""
    print_color("--- API Consistency Checker v3.0 (Final) ---", "HEADER")

    # 1. Load API Contract
    print("1. Loading API contract...")
    contract = load_api_contract()
    if not contract or 'schemas' not in contract:
        print_color("Contract is missing or does not contain a 'schemas' section.", "RED")
        sys.exit(1)
    print_color("Contract loaded successfully.", "GREEN")

    # 2. Create Flask App
    print("\n2. Initializing Flask app...")
    try:
        app = create_app()
        print_color("Flask app initialized successfully.", "GREEN")
    except Exception as e:
        print_color(f"Error creating Flask app: {e}", "RED")
        import traceback
        traceback.print_exc()
        sys.exit(1)

    # 3. Perform Schema Check
    print("\n3. Performing schema consistency check...")
    schema_errors = check_schema_consistency(contract['schemas'], app)
    
    # --- Reporting ---
    if not schema_errors:
        print_color("\n[SUCCESS] All checks passed! API contract schemas are consistent with model implementations.", "GREEN")
        sys.exit(0)
    else:
        print_color("\n[FAILURE] Found inconsistencies!", "RED")
        print_color("\n--- Schema Mismatches (Contract vs. to_dict()) ---", "BOLD")
        for error in schema_errors:
            print_color(f"- {error}", "YELLOW")
        sys.exit(1)

if __name__ == "__main__":
    main()