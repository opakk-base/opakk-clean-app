interface ComingSoonProps {
  platform: string;
}

export function ComingSoon({ platform }: ComingSoonProps) {
  const platformName =
    platform === "win32"
      ? "Windows"
      : platform === "linux"
        ? "Linux"
        : platform;

  return (
    <div className="coming-soon">
      <div className="coming-soon-icon">🚧</div>
      <h3>Coming Soon</h3>
      <p className="muted">
        {platformName} support is under development.
        <br />
        Currently available on macOS.
      </p>
    </div>
  );
}