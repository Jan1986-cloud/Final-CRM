"""
API Contract Registry voor CRM
Centrale plek voor alle API definities en automatische verificatie
"""

import json
import yaml
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any
import hashlib

class APIContract:
    """Definieert en valideert API contracts tussen frontend en backend"""
    
    def __init__(self):
        self.contracts = {}
        self.contract_file = "api_contracts.yaml"
        self.load_contracts()
    
    def load_contracts(self):
        """Laad bestaande contracts"""
        if Path(self.contract_file).exists():
            with open(self.contract_file, 'r') as f:
                self.contracts = yaml.safe_load(f) or {}
    
    def register_endpoint(self, 
                         path: str, 
                         method: str, 
                         request_schema: Dict,
                         response_schema: Dict,
                         description: str = ""):
        """Registreer een API endpoint contract"""
        
        endpoint_key = f"{method.upper()} {path}"
        
        contract = {
            "path": path,
            "method": method.upper(),
            "description": description,
            "request": request_schema,
            "response": response_schema,
            "version": self._generate_version(request_schema, response_schema),
            "updated_at": datetime.now().isoformat()
        }
        
        # Check voor breaking changes
        if endpoint_key in self.contracts:
            old_version = self.contracts[endpoint_key]["version"]
            if old_version != contract["version"]:
                print(f"⚠️  WARNING: Breaking change detected for {endpoint_key}")
                print(f"   Old version: {old_version}")
                print(f"   New version: {contract['version']}")
        
        self.contracts[endpoint_key] = contract
        self.save_contracts()
    
    def _generate_version(self, request_schema: Dict, response_schema: Dict) -> str:
        """Genereer een versie hash voor het contract"""
        combined = json.dumps({"request": request_schema, "response": response_schema}, sort_keys=True)
        return hashlib.md5(combined.encode()).hexdigest()[:8]
    
    def save_contracts(self):
        """Sla contracts op"""
        with open(self.contract_file, 'w') as f:
            yaml.dump(self.contracts, f, default_flow_style=False)
    
    def validate_request(self, path: str, method: str, data: Dict) -> tuple[bool, str]:
        """Valideer een request tegen het contract"""
        endpoint_key = f"{method.upper()} {path}"
        
        if endpoint_key not in self.contracts:
            return False, f"No contract found for {endpoint_key}"
        
        contract = self.contracts[endpoint_key]
        request_schema = contract["request"]
        
        # Simpele validatie - check required fields
        if "required" in request_schema:
            for field in request_schema["required"]:
                if field not in data:
                    return False, f"Missing required field: {field}"
        
        return True, "Valid"
    
    def generate_typescript_types(self):
        """Genereer TypeScript types voor frontend"""
        output = ["// Auto-generated API types\n"]
        
        for endpoint_key, contract in self.contracts.items():
            type_name = self._endpoint_to_type_name(endpoint_key)
            
            # Request type
            if contract["request"].get("properties"):
                output.append(f"export interface {type_name}Request {{")
                for field, schema in contract["request"]["properties"].items():
                    ts_type = self._json_to_typescript_type(schema["type"])
                    optional = "?" if field not in contract["request"].get("required", []) else ""
                    output.append(f"  {field}{optional}: {ts_type};")
                output.append("}\n")
            
            # Response type
            if contract["response"].get("properties"):
                output.append(f"export interface {type_name}Response {{")
                for field, schema in contract["response"]["properties"].items():
                    ts_type = self._json_to_typescript_type(schema["type"])
                    output.append(f"  {field}: {ts_type};")
                output.append("}\n")
        
        return "\n".join(output)
    
    def _endpoint_to_type_name(self, endpoint_key: str) -> str:
        """Convert endpoint to TypeScript type name"""
        method, path = endpoint_key.split(" ", 1)
        path_parts = [p.capitalize() for p in path.strip("/").split("/") if not p.startswith("{")]
        return f"{method.capitalize()}{''.join(path_parts)}"
    
    def _json_to_typescript_type(self, json_type: str) -> str:
        """Convert JSON Schema type to TypeScript type"""
        type_map = {
            "string": "string",
            "number": "number",
            "integer": "number",
            "boolean": "boolean",
            "array": "any[]",
            "object": "any"
        }
        return type_map.get(json_type, "any")


# Voorbeeld gebruik in Flask decorator
def contract(request_schema: Dict = None, response_schema: Dict = None, description: str = ""):
    """Decorator voor automatische contract registratie"""
    def decorator(f):
        def wrapper(*args, **kwargs):
            # Registreer contract bij eerste aanroep
            if not hasattr(wrapper, '_contract_registered'):
                from flask import request
                contract_registry.register_endpoint(
                    path=request.path,
                    method=request.method,
                    request_schema=request_schema or {},
                    response_schema=response_schema or {},
                    description=description
                )
                wrapper._contract_registered = True
            
            # Valideer request
            if request_schema and request.is_json:
                valid, error = contract_registry.validate_request(
                    request.path, request.method, request.get_json()
                )
                if not valid:
                    return {"error": error}, 400
            
            return f(*args, **kwargs)
        
        wrapper.__name__ = f.__name__
        return wrapper
    return decorator


# Gebruik in routes:
"""
@auth_bp.route('/login', methods=['POST'])
@contract(
    request_schema={
        "type": "object",
        "properties": {
            "username": {"type": "string"},
            "password": {"type": "string"}
        },
        "required": ["username", "password"]
    },
    response_schema={
        "type": "object",
        "properties": {
            "token": {"type": "string"},
            "user": {"type": "object"}
        }
    },
    description="Authenticate user and return JWT token"
)
def login():
    # ... implementatie
"""

contract_registry = APIContract()
