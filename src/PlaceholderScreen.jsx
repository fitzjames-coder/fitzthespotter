export default function PlaceholderScreen({ name }) {
  return (
    <div className="page placeholder-screen">
      <p className="placeholder-screen__name">{name}</p>
      <p className="placeholder-screen__message">Coming soon</p>
    </div>
  )
}
