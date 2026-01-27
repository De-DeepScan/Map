import { render, screen } from '@testing-library/react';
import App from './App';

test('renders planet earth title', () => {
  render(<App />);
  const titleElement = screen.getByText(/planet earth/i);
  expect(titleElement).toBeInTheDocument();
});
