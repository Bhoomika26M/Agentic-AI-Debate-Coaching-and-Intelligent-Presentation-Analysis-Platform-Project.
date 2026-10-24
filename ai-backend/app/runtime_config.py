"""Startup checks that keep the guest-mode API off a public deployment."""

PUBLIC_ENVIRONMENTS = {"public", "production"}
VALID_ENVIRONMENTS = {"local", *PUBLIC_ENVIRONMENTS}
LOOPBACK_HOSTS = {"localhost", "127.0.0.1", "0.0.0.0", "::1"}


def validate_deployment(
    *,
    environment: str,
    require_auth: bool,
    origins: list[str],
    allowed_hosts: list[str],
) -> str:
    """Return the normalized environment, or refuse to start an unsafe public one."""
    normalized = (environment or "local").strip().lower() or "local"
    if normalized not in VALID_ENVIRONMENTS:
        raise ValueError(
            f"DEPLOYMENT_ENV must be one of {', '.join(sorted(VALID_ENVIRONMENTS))}."
        )
    if normalized not in PUBLIC_ENVIRONMENTS:
        return normalized
    if not require_auth:
        raise ValueError(
            "DEPLOYMENT_ENV=public requires REQUIRE_AUTH=true with Supabase configured. "
            "Guest mode is for private, local use only."
        )
    insecure = [origin for origin in origins if not origin.lower().startswith("https://")]
    if insecure:
        raise ValueError(
            "DEPLOYMENT_ENV=public requires https origins; rejected: " + ", ".join(insecure)
        )
    loopback = [host for host in allowed_hosts if host.lower() in LOOPBACK_HOSTS]
    if loopback:
        raise ValueError(
            "DEPLOYMENT_ENV=public must name the API host; loopback hosts are not accepted: "
            + ", ".join(loopback)
        )
    return normalized
