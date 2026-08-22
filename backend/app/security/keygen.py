import argparse
from pathlib import Path

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa


def ensure_key_pair(private_key_path: Path, public_key_path: Path) -> None:
    if private_key_path.is_file() and public_key_path.is_file():
        return

    private_key_path.parent.mkdir(parents=True, exist_ok=True)
    public_key_path.parent.mkdir(parents=True, exist_ok=True)
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=3072)
    private_key_path.write_bytes(
        private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption(),
        )
    )
    public_key_path.write_bytes(
        private_key.public_key().public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo,
        )
    )
    # The private volume is mounted only by the key generator and member service.
    # Read access for the container user keeps the volume portable across images
    # whose non-root users may have different numeric IDs.
    private_key_path.chmod(0o644)
    public_key_path.chmod(0o644)


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate local RS256 JWT keys when absent")
    parser.add_argument("--private-key", required=True, type=Path)
    parser.add_argument("--public-key", required=True, type=Path)
    args = parser.parse_args()
    ensure_key_pair(args.private_key, args.public_key)
    print("JWT key pair is ready")


if __name__ == "__main__":
    main()
