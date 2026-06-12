"""
Run once after installation to apply PAI branding to Frappe Website Settings.

Usage (inside frappe-bench):
    bench --site lms.professionalaiinstitute.com execute lms.setup_branding.apply
"""

import frappe


def apply():
	site = frappe.local.site
	print(f"Applying PAI branding to site: {site}")

	settings = frappe.get_single("Website Settings")

	settings.app_name = "Professional AI Institute"
	settings.title_prefix = "PAI LMS"

	# Home page
	if not settings.home_page:
		settings.home_page = "lms"

	# Footer
	settings.footer_items = []
	settings.append("footer_items", {"label": "Certifications", "url": "https://professionalaiinstitute.com/certifications"})
	settings.append("footer_items", {"label": "About PAI", "url": "https://professionalaiinstitute.com/about"})
	settings.append("footer_items", {"label": "Verify Certificate", "url": "https://professionalaiinstitute.com/verify"})

	settings.save(ignore_permissions=True)
	frappe.db.commit()

	# Disable Frappe's default sign-up page — all users come via SSO
	system_settings = frappe.get_single("System Settings")
	system_settings.allow_signup = 0
	system_settings.save(ignore_permissions=True)
	frappe.db.commit()

	print("PAI branding applied successfully.")
	print("Next: upload /public/logo.png as the banner_image via Settings → Brand.")
