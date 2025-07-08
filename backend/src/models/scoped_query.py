from flask import has_request_context
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
from flask_sqlalchemy.query import Query as BaseQuery


class ScopedQuery(BaseQuery):
    """Automatically filter queries by the current user's company_id in a multi-tenant setup."""

    def _get_company_id(self):
        if not has_request_context():
            return None
        try:
            verify_jwt_in_request(optional=True)
            user_id = get_jwt_identity()
        except Exception:
            return None
        if not user_id:
            return None
        # avoid circular import at module load
        from src.models.database import User

        try:
            # SQLAlchemy 2.0 session.get API
            user = self.session.get(User, user_id)
        except Exception:
            return None
        if user:
            return user.company_id
        return None

    def _apply_company_scope(self):
        company_id = self._get_company_id()
        if not company_id:
            return self
        try:
            mapper_entity = self._only_full_mapper_zero(
                "ScopedQuery supports only simple single-entity queries"
            )
            model_class = mapper_entity.class_
            if hasattr(model_class, 'company_id'):
                return self.filter(model_class.company_id == company_id)
        except Exception:
            pass
        return self

    def __iter__(self):
        return super(ScopedQuery, self._apply_company_scope()).__iter__()

    def count(self):
        return super(ScopedQuery, self._apply_company_scope()).count()

    def get(self, ident):
        obj = super(ScopedQuery, self).get(ident)
        company_id = self._get_company_id()
        if company_id and hasattr(obj, 'company_id') and obj.company_id != company_id:
            return None
        return obj