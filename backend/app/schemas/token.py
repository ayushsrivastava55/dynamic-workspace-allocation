from pydantic import BaseModel
from typing import Optional

class Token(BaseModel):
    access_token: str
    token_type: str

# Optional: Add if needed later for token verification
class TokenData(BaseModel):
    email: Optional[str] = None 