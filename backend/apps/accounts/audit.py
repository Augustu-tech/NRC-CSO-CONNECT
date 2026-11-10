"""Append-only audit logging for NRC CSO CONNECT."""

from .models_audit import AuditLog


def client_ip(request):
    if not request:
        return None
    xff = request.META.get("HTTP_X_FORWARDED_FOR")
    if xff:
        return xff.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def log(request, action, *, model=None, obj=None, obj_id=None, obj_repr="",
        previous=None, new=None, reason=""):
    user = getattr(request, "user", None)
    if user is not None and not getattr(user, "is_authenticated", False):
        user = None
    return AuditLog.objects.create(
        user=user,
        action=action,
        model_name=(model._meta.label if model else ""),
        object_id=str(obj_id if obj_id is not None else (obj.pk if obj else "")),
        object_repr=(obj_repr or (str(obj) if obj else ""))[:255],
        previous_value=previous,
        new_value=new,
        ip_address=client_ip(request),
        user_agent=(request.META.get("HTTP_USER_AGENT", "")[:500] if request else ""),
        reason=reason,
    )
