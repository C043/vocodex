import { Outlet, NavLink } from "react-router-dom"

const Layout = () => {
  const link = ({ isActive }: { isActive: boolean }) =>
    isActive ? "font-semibold mr-4" : "mr-4"

  return (
    <div className="flex flex-col min-h-screen min-w-screen">
      <nav className="p-4 border-b flex justify-center">
        <NavLink to="/" className={link}>
          Home
        </NavLink>
        <NavLink to="/login" className={link}>
          Login
        </NavLink>
        <NavLink to="/register" className={link}>
          Register
        </NavLink>
      </nav>
      <main className="flex flex-col flex-1 items-center justify-center p-6">
        <Outlet />
      </main>
    </div>
  )
}

export default Layout
