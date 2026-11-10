"""Auto-audit ViewSet create/update/destroy."""

from .audit import log


def _snapshot(obj):
    data = {}
    for f in obj._meta.fields:
        v = getattr(obj, f.name, None)
        if hasattr(v, "isoformat"):
            v = v.isoformat()
        elif v is not None and not isinstance(v, (str, int, float, bool)):
            v = str(v)
        data[f.name] = v
    return data


class AuditMixin:
    def perform_create(self, serializer):
        super().perform_create(serializer)
        log(self.request, "CREATE",
            model=serializer.Meta.model, obj=serializer.instance,
            new=_snapshot(serializer.instance))

    def perform_update(self, serializer):
        before = _snapshot(serializer.instance)
        super().perform_update(serializer)
        log(self.request, "UPDATE",
            model=serializer.Meta.model, obj=serializer.instance,
            previous=before, new=_snapshot(serializer.instance))

    def perform_destroy(self, instance):
        snap = _snapshot(instance)
        model = instance._meta.model
        pk = instance.pk
        repr_ = str(instance)
        super().perform_destroy(instance)
        log(self.request, "DELETE",
            model=model, obj_id=pk, obj_repr=repr_, previous=snap)
