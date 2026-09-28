import { Outlet } from 'react-router-dom';
import CommandHeader from './CommandHeader';
import Sidebar from './Sidebar';

export default function CommandLayout() {
  return (
    <div className="min-h-screen bg-canvas">
      <CommandHeader />
      <Sidebar />
      <main className="ml-[240px] mt-[48px] min-h-[calc(100vh-48px)]">
        <Outlet />
      </main>
    </div>
  );
}
