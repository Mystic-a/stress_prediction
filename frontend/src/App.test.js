import { render, screen } from '@testing-library/react';
import App from './App';

test('renders stress prediction app title', () => {
  render(<App />);
  const titleElement = screen.getByText(/stress predictor/i);
  expect(titleElement).toBeInTheDocument();
});
