import { RouterProvider } from 'react-router-dom';
import { Providers } from './app/providers';
import { router } from './app/router';
import { Lightbox } from './components/ui/Lightbox';

export default function App() {
  return (
    <Providers>
      <RouterProvider router={router} />
      <Lightbox />
    </Providers>
  );
}
