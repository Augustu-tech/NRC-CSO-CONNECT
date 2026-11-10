# This is an auto-generated Django model module.
# You'll have to do the following manually to clean this up:
#   * Rearrange models' order
#   * Make sure each model has one field with primary_key=True
#   * Make sure each ForeignKey and OneToOneField has `on_delete` set to the desired behavior
#   * Remove `managed = False` lines if you wish to allow Django to create, modify, and delete the table
# Feel free to rename the models, but don't rename db_table values or field names.
from django.db import models


class AccountsUser(models.Model):
    id = models.BigAutoField(primary_key=True)
    password = models.CharField(max_length=128)
    last_login = models.DateTimeField(blank=True, null=True)
    is_superuser = models.BooleanField()
    username = models.CharField(unique=True, max_length=150)
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)
    is_staff = models.BooleanField()
    is_active = models.BooleanField()
    date_joined = models.DateTimeField()
    role = models.CharField(max_length=30)
    email = models.CharField(unique=True, max_length=254, blank=True, null=True)
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()
    member = models.OneToOneField('MembersMember', models.DO_NOTHING, blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'accounts_user'


class AccountsUserGroups(models.Model):
    id = models.BigAutoField(primary_key=True)
    user = models.ForeignKey(AccountsUser, models.DO_NOTHING)
    group = models.ForeignKey('AuthGroup', models.DO_NOTHING)

    class Meta:
        managed = False
        db_table = 'accounts_user_groups'
        unique_together = (('user', 'group'),)


class AccountsUserUserPermissions(models.Model):
    id = models.BigAutoField(primary_key=True)
    user = models.ForeignKey(AccountsUser, models.DO_NOTHING)
    permission = models.ForeignKey('AuthPermission', models.DO_NOTHING)

    class Meta:
        managed = False
        db_table = 'accounts_user_user_permissions'
        unique_together = (('user', 'permission'),)


class ActivitiesActivity(models.Model):
    id = models.BigAutoField(primary_key=True)
    title = models.CharField(max_length=200)
    date = models.DateField()
    description = models.TextField()
    is_cancelled = models.BooleanField()
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()
    affiliate = models.ForeignKey('OrganizationsAffiliate', models.DO_NOTHING, blank=True, null=True)
    mphakati = models.ForeignKey('OrganizationsMphakati', models.DO_NOTHING, blank=True, null=True)
    semester = models.ForeignKey('OrganizationsSemester', models.DO_NOTHING)
    category = models.ForeignKey('ActivitiesActivitycategory', models.DO_NOTHING)

    class Meta:
        managed = False
        db_table = 'activities_activity'


class ActivitiesActivitycategory(models.Model):
    id = models.BigAutoField(primary_key=True)
    name = models.CharField(unique=True, max_length=100)
    description = models.TextField()
    is_scoreable = models.BooleanField()
    is_active = models.BooleanField()
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'activities_activitycategory'


class ActivitiesAffiliatescoringcomponent(models.Model):
    id = models.BigAutoField(primary_key=True)
    component_type = models.CharField(max_length=20)
    weight = models.DecimalField(max_digits=5, decimal_places=2)
    affiliate = models.ForeignKey('OrganizationsAffiliate', models.DO_NOTHING)
    configuration = models.ForeignKey('ActivitiesScoringconfiguration', models.DO_NOTHING)

    class Meta:
        managed = False
        db_table = 'activities_affiliatescoringcomponent'
        unique_together = (('configuration', 'affiliate', 'component_type'),)


class ActivitiesMonthlymphakatiaward(models.Model):
    id = models.BigAutoField(primary_key=True)
    winning_score = models.DecimalField(max_digits=6, decimal_places=2, blank=True, null=True)
    status = models.CharField(max_length=20)
    notes = models.TextField()
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()
    finalized_at = models.DateTimeField(blank=True, null=True)
    configuration = models.OneToOneField('ActivitiesScoringconfiguration', models.DO_NOTHING)

    class Meta:
        managed = False
        db_table = 'activities_monthlymphakatiaward'


class ActivitiesMonthlymphakatiawardwinner(models.Model):
    id = models.BigAutoField(primary_key=True)
    rank = models.IntegerField()
    score = models.DecimalField(max_digits=6, decimal_places=2)
    created_at = models.DateTimeField()
    award = models.ForeignKey(ActivitiesMonthlymphakatiaward, models.DO_NOTHING)
    mphakati = models.ForeignKey('OrganizationsMphakati', models.DO_NOTHING)

    class Meta:
        managed = False
        db_table = 'activities_monthlymphakatiawardwinner'
        unique_together = (('award', 'mphakati'),)


class ActivitiesParticipation(models.Model):
    id = models.BigAutoField(primary_key=True)
    status = models.CharField(max_length=20)
    recorded_at = models.DateTimeField()
    notes = models.TextField()
    activity = models.ForeignKey(ActivitiesActivity, models.DO_NOTHING)
    member = models.ForeignKey('MembersMember', models.DO_NOTHING)

    class Meta:
        managed = False
        db_table = 'activities_participation'
        unique_together = (('activity', 'member'),)


class ActivitiesScoringconfiguration(models.Model):
    id = models.BigAutoField(primary_key=True)
    month = models.DateField()
    status = models.CharField(max_length=20)
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()
    finalized_at = models.DateTimeField(blank=True, null=True)
    semester = models.ForeignKey('OrganizationsSemester', models.DO_NOTHING)

    class Meta:
        managed = False
        db_table = 'activities_scoringconfiguration'
        unique_together = (('semester', 'month'),)


class ActivitiesScoringrule(models.Model):
    id = models.BigAutoField(primary_key=True)
    weight = models.DecimalField(max_digits=5, decimal_places=2)
    category = models.ForeignKey(ActivitiesActivitycategory, models.DO_NOTHING)
    configuration = models.ForeignKey(ActivitiesScoringconfiguration, models.DO_NOTHING)

    class Meta:
        managed = False
        db_table = 'activities_scoringrule'
        unique_together = (('configuration', 'category'),)


class AuthGroup(models.Model):
    name = models.CharField(unique=True, max_length=150)

    class Meta:
        managed = False
        db_table = 'auth_group'


class AuthGroupPermissions(models.Model):
    id = models.BigAutoField(primary_key=True)
    group = models.ForeignKey(AuthGroup, models.DO_NOTHING)
    permission = models.ForeignKey('AuthPermission', models.DO_NOTHING)

    class Meta:
        managed = False
        db_table = 'auth_group_permissions'
        unique_together = (('group', 'permission'),)


class AuthPermission(models.Model):
    name = models.CharField(max_length=255)
    content_type = models.ForeignKey('DjangoContentType', models.DO_NOTHING)
    codename = models.CharField(max_length=100)

    class Meta:
        managed = False
        db_table = 'auth_permission'
        unique_together = (('content_type', 'codename'),)


class DjangoAdminLog(models.Model):
    action_time = models.DateTimeField()
    object_id = models.TextField(blank=True, null=True)
    object_repr = models.CharField(max_length=200)
    action_flag = models.SmallIntegerField()
    change_message = models.TextField()
    content_type = models.ForeignKey('DjangoContentType', models.DO_NOTHING, blank=True, null=True)
    user = models.ForeignKey(AccountsUser, models.DO_NOTHING)

    class Meta:
        managed = False
        db_table = 'django_admin_log'


class DjangoContentType(models.Model):
    app_label = models.CharField(max_length=100)
    model = models.CharField(max_length=100)

    class Meta:
        managed = False
        db_table = 'django_content_type'
        unique_together = (('app_label', 'model'),)


class DjangoMigrations(models.Model):
    id = models.BigAutoField(primary_key=True)
    app = models.CharField(max_length=255)
    name = models.CharField(max_length=255)
    applied = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'django_migrations'


class DjangoSession(models.Model):
    session_key = models.CharField(primary_key=True, max_length=40)
    session_data = models.TextField()
    expire_date = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'django_session'


class FinanceFinancecategory(models.Model):
    id = models.BigAutoField(primary_key=True)
    name = models.CharField(max_length=100)
    transaction_type = models.CharField(max_length=10)
    description = models.TextField()
    is_active = models.BooleanField()
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'finance_financecategory'
        unique_together = (('name', 'transaction_type'),)


class FinanceFinancetransaction(models.Model):
    id = models.BigAutoField(primary_key=True)
    transaction_type = models.CharField(max_length=10)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    transaction_date = models.DateField()
    description = models.TextField()
    reference_number = models.CharField(max_length=100)
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()
    category = models.ForeignKey(FinanceFinancecategory, models.DO_NOTHING)
    member = models.ForeignKey('MembersMember', models.DO_NOTHING, blank=True, null=True)
    mphakati = models.ForeignKey('OrganizationsMphakati', models.DO_NOTHING, blank=True, null=True)
    recorded_by = models.ForeignKey(AccountsUser, models.DO_NOTHING)
    semester = models.ForeignKey('OrganizationsSemester', models.DO_NOTHING)
    approval_status = models.CharField(max_length=10)
    approved_at = models.DateTimeField(blank=True, null=True)
    approved_by = models.ForeignKey(AccountsUser, models.DO_NOTHING, related_name='financefinancetransaction_approved_by_set', blank=True, null=True)
    rejection_reason = models.TextField()

    class Meta:
        managed = False
        db_table = 'finance_financetransaction'


class MembersMember(models.Model):
    id = models.BigAutoField(primary_key=True)
    student_id = models.CharField(unique=True, max_length=50)
    first_name = models.CharField(max_length=100)
    middle_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    gender = models.CharField(max_length=1)
    phone = models.CharField(max_length=30)
    email = models.CharField(max_length=254)
    date_joined = models.DateField()
    status = models.CharField(max_length=20)
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'members_member'


class MembersMphakatimembership(models.Model):
    id = models.BigAutoField(primary_key=True)
    start_date = models.DateField()
    end_date = models.DateField(blank=True, null=True)
    is_current = models.BooleanField()
    created_at = models.DateTimeField()
    member = models.ForeignKey(MembersMember, models.DO_NOTHING)
    mphakati = models.ForeignKey('OrganizationsMphakati', models.DO_NOTHING)
    semester = models.ForeignKey('OrganizationsSemester', models.DO_NOTHING)

    class Meta:
        managed = False
        db_table = 'members_mphakatimembership'
        unique_together = (('member', 'semester'),)


class OrganizationsAcademicyear(models.Model):
    id = models.BigAutoField(primary_key=True)
    name = models.CharField(unique=True, max_length=20)
    start_date = models.DateField()
    end_date = models.DateField()
    is_active = models.BooleanField()

    class Meta:
        managed = False
        db_table = 'organizations_academicyear'


class OrganizationsAffiliate(models.Model):
    id = models.BigAutoField(primary_key=True)
    name = models.CharField(unique=True, max_length=100)
    description = models.TextField()
    is_active = models.BooleanField()
    created_at = models.DateTimeField()
    scoring_method = models.CharField(max_length=20)
    updated_at = models.DateTimeField()

    class Meta:
        managed = False
        db_table = 'organizations_affiliate'


class OrganizationsAffiliatemembership(models.Model):
    id = models.BigAutoField(primary_key=True)
    start_date = models.DateField()
    end_date = models.DateField(blank=True, null=True)
    is_active = models.BooleanField()
    created_at = models.DateTimeField()
    affiliate = models.ForeignKey(OrganizationsAffiliate, models.DO_NOTHING)
    member = models.ForeignKey(MembersMember, models.DO_NOTHING)
    semester = models.ForeignKey('OrganizationsSemester', models.DO_NOTHING)

    class Meta:
        managed = False
        db_table = 'organizations_affiliatemembership'
        unique_together = (('member', 'affiliate', 'semester'),)


class OrganizationsMphakati(models.Model):
    id = models.BigAutoField(primary_key=True)
    name = models.CharField(unique=True, max_length=100)
    description = models.TextField()
    is_active = models.BooleanField()

    class Meta:
        managed = False
        db_table = 'organizations_mphakati'


class OrganizationsSemester(models.Model):
    id = models.BigAutoField(primary_key=True)
    number = models.IntegerField()
    start_date = models.DateField()
    end_date = models.DateField()
    is_active = models.BooleanField()
    academic_year = models.ForeignKey(OrganizationsAcademicyear, models.DO_NOTHING)

    class Meta:
        managed = False
        db_table = 'organizations_semester'
        unique_together = (('academic_year', 'number'),)
