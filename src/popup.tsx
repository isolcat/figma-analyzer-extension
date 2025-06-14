import { createRoot } from 'react-dom/client';
import FigmaAnalyzer from './components/FigmaAnalyzer';
import './popup.css';

const container = document.getElementById('popup-root');
if (container) {
  const root = createRoot(container);
  root.render(<FigmaAnalyzer />);
} 
