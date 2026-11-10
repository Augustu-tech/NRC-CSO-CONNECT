#!/usr/bin/env python
"""NRC CSO CONNECT — Phase 2 model verification script."""
import os
import sys
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import connection

EXPECTED = {
    "accounts.User": 6,
    "members.Member": 8,
    "organizations.Mphakati": 4,
    "activities.Activity": 9,
    "finance.FinanceTransaction": 5,
}


def main():
    print("=" * 72)
    print("NRC CSO CONNECT — Phase 2 Model Verification")
    print("=" * 72)
    print(f"Django:           {django.get_version()}")
    print(f"DB engine:        {connection.settings_dict['ENGINE']}")
    print(f"DB name:          {connection.settings_dict['NAME']}")
    print(f"AUTH_USER_MODEL:  {settings.AUTH_USER_MODEL}")
    print()

    User = get_user_model()
    print(f"Resolved User:    {User._meta.label}  (table={User._meta.db_table})")
    print(f"User pk type:     {User._meta.pk.__class__.__name__}")
    print()

    all_models = [m for m in django.apps.apps.get_models()
                  if m._meta.app_label in
                  ("accounts", "organizations", "members", "activities", "finance")]
    all_models.sort(key=lambda m: m._meta.label)
    print(f"Found {len(all_models)} local models:")
    print()

    print(f"{'Model':<48} {'Rows':>8} {'Expected':>10} {'Status':>8}")
    print("-" * 78)

    ok = True
    for m in all_models:
        label = m._meta.label
        try:
            count = m.objects.count()
        except Exception as exc:
            print(f"{label:<48} {'ERR':>8} {str(EXPECTED.get(label, '-')):>10} {'FAIL':>8}")
            print(f"    → {exc}")
            ok = False
            continue
        exp = EXPECTED.get(label)
        if exp is None:
            status = "info"
        elif count == exp:
            status = "OK"
        else:
            status = "MISMATCH"
            ok = False
        print(f"{label:<48} {count:>8} {str(exp if exp is not None else '-'):>10} {status:>8}")

    print()
    if ok:
        print("ALL CHECKS PASSED — models can read the recovered database.")
        print()
        try:
            print(f"  sample User:       {User.objects.first()}")
            from apps.organizations.models import Mphakati
            print(f"  miphakati:         {list(Mphakati.objects.values_list('name', flat=True))}")
            from apps.members.models import Member
            print(f"  sample Member:     {Member.objects.first()}")
            from apps.activities.models import Activity
            print(f"  sample Activity:   {Activity.objects.first()}")
            from apps.finance.models import FinanceTransaction
            print(f"  sample Tx:         {FinanceTransaction.objects.first()}")
        except Exception as exc:
            print(f"  (sample read failed: {exc})")
    else:
        print("SOME CHECKS FAILED — see rows above marked MISMATCH/FAIL.")
        print("Common causes:")
        print("  • apps.py uses 'accounts' instead of 'apps.accounts'")
        print("  • AUTH_USER_MODEL missing from settings")
        print("  • INSTALLED_APPS missing a local app")
        print("  • Field type does not match the DB column")

    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())