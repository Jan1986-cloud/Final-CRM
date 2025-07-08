from firebase_functions import https_fn
from firebase_admin import initialize_app
from backend.src.main import create_app
import os

initialize_app()

# Globale instantie van de Flask app, gemaakt via de factory
flask_app = create_app()

@https_fn.on_request()
def api_gateway(request: https_fn.Request) -> https_fn.Response:
    """Main entry point that routes incoming HTTP requests to the Flask app."""
    # Flask applicatie draait op de poort zoals gespecificeerd door Cloud Run
    # Flask's ingebouwde server wordt niet gebruikt in Cloud Functions/Run.
    # De app object zelf (gecreëerd door create_app()) is het WSGI callable.
    # `request` is een Werkzeug Request object hier.
    return flask_app.wsgi_app(request.environ, lambda status, headers: None)