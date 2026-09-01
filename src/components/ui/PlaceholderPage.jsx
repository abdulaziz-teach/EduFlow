import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Button from './Button';

function PlaceholderPage({ icon: Icon, title, description }) {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <Icon className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-text mb-3">{title}</h1>
        <p className="text-muted mb-8 leading-relaxed">{description}</p>
        <Button to="/" variant="secondary" size="md">
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Button>
      </div>
    </div>
  );
}

export default PlaceholderPage;
