from django.core.mail import EmailMultiAlternatives
from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView

from apps.members.models import Member, MphakatiMembership
from apps.organizations.models import Mphakati, Semester
from .models import User


class CustomTokenObtainPairView(TokenObtainPairView):
    """Override login to block inactive members."""
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        
        if response.status_code == 200:
            username = request.data.get("username")
            user = User.objects.filter(username=username).first()
            
            if user:
                if not user.is_active:
                    return Response({"detail": "This account has been disabled."}, status=status.HTTP_403_FORBIDDEN)
                
                if user.member and user.member.status != "ACTIVE":
                    return Response(
                        {"detail": f"Your account is {user.member.status}. Please contact the CSO Secretary."}, 
                        status=status.HTTP_403_FORBIDDEN
                    )
                    
        return response


@api_view(["POST"])
@permission_classes([AllowAny])
def register(request):
    """Public registration for new members."""
    data = request.data
    username = data.get("username")
    password = data.get("password")
    email = data.get("email")
    first_name = data.get("first_name")
    last_name = data.get("last_name")
    student_id = data.get("student_id")
    mphakati_id = data.get("mphakati_id")

    if not all([username, password, email, first_name, last_name, student_id, mphakati_id]):
        return Response({"detail": "All fields are required."}, status=400)

    if User.objects.filter(username=username).exists():
        return Response({"detail": "Username already exists."}, status=400)
        
    if Member.objects.filter(student_id=student_id).exists():
        return Response({"detail": "Student ID already registered."}, status=400)

    semester = Semester.objects.filter(is_active=True).first()
    if not semester:
        return Response({"detail": "No active semester configured."}, status=400)

    try:
        mphakati = Mphakati.objects.get(id=mphakati_id)
    except Mphakati.DoesNotExist:
        return Response({"detail": "Invalid Mphakati selected."}, status=400)

    member = Member.objects.create(
        student_id=student_id,
        first_name=first_name,
        last_name=last_name,
        email=email,
        status="INACTIVE",
        date_joined=semester.start_date,
    )
    
    MphakatiMembership.objects.create(
        member=member,
        mphakati=mphakati,
        semester=semester,
        start_date=semester.start_date,
        is_current=True,
    )

    user = User.objects.create_user(
        username=username,
        password=password,
        email=email,
        first_name=first_name,
        last_name=last_name,
        role="member",
    )
    user.member = member
    user.save()

    return Response({"detail": "Registration successful. Your account is pending approval by the Secretary."}, status=201)


@api_view(["POST"])
@permission_classes([AllowAny])
def forgot_password(request):
    email = request.data.get("email")
    user = User.objects.filter(email=email).first()
    
    if not user:
        return Response({"detail": "If that email exists, a reset link has been sent."})

    uidb64 = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    
    # IMPORTANT: Change localhost to your real domain in production
    reset_link = f"http://localhost:5173/reset-password?uid={uidb64}&token={token}"
    
    # Also print to terminal just in case for debugging
    print("\n" + "="*70)
    print(f"PASSWORD RESET FOR: {user.username} ({user.email})")
    print(f"Link: {reset_link}")
    print("="*70 + "\n")
    
    subject = "Password Reset - NRC CSO Connect"
    
    # Plain text fallback
    text_content = f"Hello {user.first_name},\n\nYou requested a password reset for your NRC CSO Connect account.\n\nClick the link below to reset your password:\n{reset_link}\n\nIf you did not request this, please ignore this email.\n\nGod bless,\nNRC CSO Connect"
    
    # Beautiful HTML Email
    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8fafc; padding: 40px 20px;">
        <div style="background-color: #1e1b4b; padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
            <h1 style="color: #d4a017; margin: 0; font-family: 'Times New Roman', serif; font-size: 28px;">NRC CSO CONNECT</h1>
            <p style="color: #818cf8; margin: 5px 0 0 0; font-size: 12px; letter-spacing: 2px; text-transform: uppercase;">Faith · Community · Service</p>
        </div>
        <div style="background-color: #ffffff; padding: 40px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
            <h2 style="color: #0f172a; margin-top: 0;">Hello {user.first_name},</h2>
            <p style="color: #475569; line-height: 1.6; font-size: 16px;">
                We received a request to reset the password for your NRC CSO Connect account. Click the button below to choose a new password.
            </p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="{reset_link}" style="background-color: #4338ca; color: #ffffff; text-decoration: none; padding: 14px 30px; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">Reset My Password</a>
            </div>
            <p style="color: #475569; line-height: 1.6; font-size: 14px;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <a href="{reset_link}" style="color: #4338ca; word-break: break-all;">{reset_link}</a>
            </p>
            <p style="color: #94a3b8; font-size: 13px; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 20px;">
                If you did not request this, you can safely ignore this email. Your password will not change.<br><br>
                God bless,<br>
                <strong>NRC CSO Connect</strong>
            </p>
        </div>
    </div>
    """
    
    try:
        msg = EmailMultiAlternatives(
            subject,
            text_content,
            settings.DEFAULT_FROM_EMAIL,
            [user.email],
        )
        msg.attach_alternative(html_content, "text/html")
        msg.send()
        print(f"✅ Email successfully sent via Resend to {user.email}")
    except Exception as e:
        print(f"❌ RESEND ERROR: {e}")
        return Response({"detail": f"Email failed to send: {str(e)}"}, status=500)

    return Response({"detail": "If that email exists, a reset link has been sent."})


@api_view(["POST"])
@permission_classes([AllowAny])
def reset_password_confirm(request):
    uidb64 = request.data.get("uid")
    token = request.data.get("token")
    new_password = request.data.get("new_password")

    if not all([uidb64, token, new_password]):
        return Response({"detail": "Missing fields."}, status=400)

    try:
        uid = force_str(urlsafe_base64_decode(uidb64))
        user = User.objects.get(pk=uid)
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        return Response({"detail": "Invalid reset link."}, status=400)

    if not default_token_generator.check_token(user, token):
        return Response({"detail": "The reset link has expired or is invalid."}, status=400)

    user.set_password(new_password)
    user.save()
    return Response({"detail": "Password has been reset successfully. You can now log in."})
