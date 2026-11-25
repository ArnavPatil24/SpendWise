import { Component } from 'react';
import { LogoMark } from './Logo';

/** Last line of defence: a rendering bug shows a friendly page instead of a blank screen. */
export default class ErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() { return { failed: true }; }

  componentDidCatch(error, info) { console.error('UI crashed:', error, info?.componentStack); }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="crash" role="alert">
        <LogoMark size={52} />
        <h1>Something went wrong</h1>
        <p>The page hit an unexpected problem. Your data is safe. Reloading usually fixes it.</p>
        <div className="btn-group">
          <button className="btn btn-primary" onClick={() => window.location.reload()}>Reload the page</button>
          <button className="btn btn-secondary" onClick={() => { window.location.href = '/'; }}>Go to overview</button>
        </div>
      </div>
    );
  }
}
