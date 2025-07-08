from firebase_functions import https_fn
from firebase_admin import initialize_app
from backend.src.main import create_app

# Initialize Firebase Admin SDK.
initialize_app()

# Create the Flask app using the application factory.
flask_app = create_app()

@https_fn.on_request()
def api_gateway(request: https_fn.Request) -> https_fn.Response:
    """
    Main entry point that routes incoming HTTP requests to the Flask app.
    """
    # The request object from Firebase is WSGI-compliant.
    # We can pass it to the Flask app's WSGI handler.
    # The `WsgiRequest` and `WsgiResponse` are helper classes to bridge
    # the Firebase and WSGI worlds.
    from werkzeug.wrappers import Request, Response
    
    @Request.application
    def app(request_wsgi):
        return flask_app.wsgi_app(request_wsgi.environ, lambda status, headers: None)

    return Response.from_app(app, request.environ)
