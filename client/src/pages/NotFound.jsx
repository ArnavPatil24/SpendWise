import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import EmptyState from '../components/ui/EmptyState';

export default function NotFound() {
  return (
    <div className="panel" style={{ marginTop: 40 }}>
      <EmptyState
        icon={Compass}
        title="That page doesn’t exist"
        text="The link may be out of date. Head back to your overview."
        action={<Link className="btn btn-primary" to="/">Go to overview</Link>}
      />
    </div>
  );
}
