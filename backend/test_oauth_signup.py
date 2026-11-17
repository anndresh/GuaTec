"""Regression coverage for setting a first password on an OAuth account."""
from __future__ import annotations

import unittest

from app import create_app
from app.extensions import db
from app.models import User
from app.utils.auth_tokens import issue_token


class OAuthSignupTests(unittest.TestCase):
    def setUp(self) -> None:
        app = create_app("testing")
        app.config["JWT_SECRET"] = "oauth-signup-test-only-session-secret"
        self.context = app.app_context()
        self.context.push()
        self.addCleanup(self.context.pop)
        self.client = app.test_client()

    def test_initial_password_requires_the_accounts_session(self) -> None:
        for provider in ("google", "github"):
            with self.subTest(provider=provider):
                existing = User(
                    email=f"{provider}@example.test",
                    oauth_provider=provider,
                    oauth_subject=f"{provider}-fixture",
                )
                other = User(oauth_provider="guest")
                db.session.add_all([existing, other])
                db.session.commit()
                existing_id = existing.id
                credentials = {"email": existing.email, "password": "oauth-fixture-password"}

                for headers in ({}, {"Authorization": f"Bearer {issue_token(other.id)}"}):
                    response = self.client.post("/api/auth/register", json=credentials, headers=headers)
                    self.assertEqual(response.status_code, 409)
                    self.assertIsNone(db.session.get(User, existing_id).password_hash)

                owner = {"Authorization": f"Bearer {issue_token(existing_id)}"}
                response = self.client.post("/api/auth/register", json=credentials, headers=owner)
                self.assertEqual(response.status_code, 201)
                self.assertEqual(response.get_json()["user"]["id"], existing_id)
                self.assertTrue(db.session.get(User, existing_id).check_password(credentials["password"]))
                self.assertEqual(self.client.post("/api/auth/register", json=credentials, headers=owner).status_code, 409)

    def test_new_email_registration_remains_available(self) -> None:
        response = self.client.post(
            "/api/auth/register",
            json={"email": "new@example.test", "password": "ordinary-fixture-password"},
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.get_json()["user"]["oauthProvider"], "password")
