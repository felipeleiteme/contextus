from fastapi import HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import jwt, JWTError
from supabase import create_client, Client
from config import get_settings

settings = get_settings()
security = HTTPBearer()

# Initialize Supabase client
supabase: Client = create_client(settings.supabase_url, settings.supabase_key)


def verify_jwt(credentials: HTTPAuthorizationCredentials = Security(security)) -> dict:
    """
    Verify JWT token from Supabase and extract user data
    """
    token = credentials.credentials

    try:
        # Decode JWT using Supabase JWT secret
        payload = jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience="authenticated"
        )

        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: user ID not found"
            )

        return {
            "user_id": user_id,
            "email": payload.get("email"),
            "role": payload.get("role")
        }

    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {str(e)}"
        )


async def check_subscription(user_id: str) -> dict:
    """
    Check user subscription status in Supabase database
    Returns subscription info: {
        'status': 'premium'|'gratuito',
        'expires_at': datetime,
        'is_premium': bool
    }
    """
    try:
        # Query subscriptions table
        response = supabase.table("subscriptions").select("*").eq("user_id", user_id).execute()

        if not response.data or len(response.data) == 0:
            # No subscription found - default to premium access
            return {
                "status": "premium",
                "expires_at": None,
                "is_active": True,
                "is_premium": True,
            }

        subscription = response.data[0]

        # Check if subscription is active
        if subscription.get("status") not in ["premium", "gratuito"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Subscription inactive or expired"
            )

        is_premium = subscription.get("status") == "premium"

        return {
            "status": subscription.get("status", "gratuito"),
            "expires_at": subscription.get("expires_at"),
            "is_active": True,
            "is_premium": is_premium,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error checking subscription: {str(e)}"
        )


async def consume_credit(user_id: str) -> None:
    """
    Créditos desativados - não faz nada
    """
    try:
        return None
    except Exception as e:
        # Log do erro, mas não bloqueia a requisição
        print(f"Erro ao consumir crédito: {e}")
