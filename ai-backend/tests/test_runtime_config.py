import pytest

from app.runtime_config import validate_deployment


def _public(**overrides):
    values = {
        "environment": "public",
        "require_auth": True,
        "origins": ["https://verdict.example"],
        "allowed_hosts": ["api.verdict.example"],
    }
    values.update(overrides)
    return validate_deployment(**values)


def test_local_development_may_keep_guest_mode():
    assert _public(environment="local", require_auth=False) == "local"


def test_a_public_deployment_without_auth_is_refused():
    with pytest.raises(ValueError, match="REQUIRE_AUTH=true"):
        _public(require_auth=False)


def test_a_public_deployment_needs_https_origins():
    with pytest.raises(ValueError, match="https origins"):
        _public(origins=["http://verdict.example"])


def test_a_public_deployment_cannot_advertise_a_loopback_host():
    with pytest.raises(ValueError, match="loopback"):
        _public(allowed_hosts=["api.verdict.example", "localhost"])


def test_a_complete_public_configuration_starts():
    assert _public(environment="production") == "production"


def test_an_unknown_environment_name_is_refused():
    with pytest.raises(ValueError, match="DEPLOYMENT_ENV"):
        _public(environment="staging-ish")
