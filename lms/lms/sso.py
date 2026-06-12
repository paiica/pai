import frappe
import jwt
from frappe import _


def login():
	"""
	SSO entry point called by PAI.
	URL: /api/method/lms.sso.login?token=<signed_jwt>
	"""
	token = frappe.form_dict.get("token")
	if not token:
		frappe.throw(_("Missing SSO token"), frappe.AuthenticationError)

	secret = frappe.conf.get("lms_sso_secret")
	if not secret:
		frappe.throw(_("SSO not configured on this server"), frappe.AuthenticationError)

	try:
		payload = jwt.decode(token, secret, algorithms=["HS256"])
	except jwt.ExpiredSignatureError:
		frappe.throw(_("SSO token has expired. Please try again."), frappe.AuthenticationError)
	except jwt.InvalidTokenError:
		frappe.throw(_("Invalid SSO token."), frappe.AuthenticationError)

	if payload.get("iss") != "pai":
		frappe.throw(_("Invalid token issuer."), frappe.AuthenticationError)

	email = payload.get("email")
	full_name = payload.get("full_name", email)

	if not email:
		frappe.throw(_("Token missing email."), frappe.AuthenticationError)

	_ensure_user_exists(email, full_name)

	frappe.local.login_manager.login_as(email)
	frappe.db.commit()

	frappe.local.response["type"] = "redirect"
	frappe.local.response["location"] = "/lms"


def _ensure_user_exists(email: str, full_name: str):
	if frappe.db.exists("User", email):
		return

	first, _, last = full_name.partition(" ")
	user = frappe.get_doc({
		"doctype": "User",
		"email": email,
		"first_name": first or full_name,
		"last_name": last or "",
		"full_name": full_name,
		"user_type": "Website User",
		"send_welcome_email": 0,
		"enabled": 1,
	})
	user.insert(ignore_permissions=True)
	frappe.db.commit()
