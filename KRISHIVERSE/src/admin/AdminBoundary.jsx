import React, { Component } from "react";

/**
 * Keeps an admin-render failure inside /admin: the farmer app keeps running
 * even if the dashboard throws while rendering.
 */
export default class AdminBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error("Admin dashboard render failure:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-base-200 flex items-center justify-center p-6">
          <div className="alert alert-error max-w-md">
            <div>
              <h1 className="font-semibold">Admin dashboard failed to render</h1>
              <p className="text-sm mt-1">{String(this.state.error?.message || this.state.error)}</p>
              <p className="text-xs mt-2 opacity-70">Farmer-facing features are unaffected.</p>
            </div>
            <button type="button" className="btn btn-sm" onClick={() => this.setState({ error: null })}>
              Retry
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
