import React from 'react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <p className="error-boundary__title">Something went wrong.</p>
          <p className="error-boundary__text">The app hit an unexpected error. Your data is safe.</p>
          <button className="error-boundary__btn" onClick={() => window.location.reload()}>Reload the app</button>
        </div>
      )
    }
    return this.props.children
  }
}
