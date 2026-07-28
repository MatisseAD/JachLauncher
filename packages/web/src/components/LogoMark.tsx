export default function LogoMark({
  size = 34,
  text = true,
}: {
  size?: number;
  text?: boolean;
}) {
  return (
    <>
      <span
        className="logo-symbol"
        style={{ width: size, height: size }}
        aria-hidden="true"
      >
        <span>Y</span>
        <i />
      </span>
      {text && (
        <span className="logo-wordmark">
          Your<span>Launcher</span>
        </span>
      )}
    </>
  );
}
