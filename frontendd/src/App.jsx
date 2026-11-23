import { Navigate, Route, Routes } from "react-router-dom";
import { Frame } from "./components/Shell";
import Home from "./pages/Home";
import Providers from "./pages/Providers";
import ProviderDetails from "./pages/ProviderDetails";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import Booking from "./pages/Booking";
import Review from "./pages/Review";
import CustomerDashboard from "./pages/customer/Dashboard";
import ProviderDashboard from "./pages/provider/Dashboard";
import Portfolio from "./pages/provider/Portfolio";
import Profile from "./pages/account/Profile";
import Password from "./pages/account/Password";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminBookings from "./pages/admin/Bookings";
import AdminReviews from "./pages/admin/Reviews";
import AdminMessages from "./pages/admin/Messages";

function App() {
  return (
    <Routes>
      <Route element={<Frame />}>
        <Route path="/" element={<Home />} />
        <Route path="/providers" element={<Providers />} />
        <Route path="/providers/:id" element={<ProviderDetails />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />

        <Route path="/customer/dashboard" element={<CustomerDashboard />} />
        <Route path="/booking/:id" element={<Booking />} />
        <Route path="/review/:id" element={<Review />} />
        <Route path="/customer/edit-profile" element={<Navigate to="/account/profile" replace />} />

        <Route path="/provider/dashboard" element={<ProviderDashboard />} />
        <Route path="/provider/portfolio" element={<Portfolio />} />
        <Route path="/provider/edit-profile" element={<Navigate to="/account/profile" replace />} />

        <Route path="/account/profile" element={<Profile />} />
        <Route path="/account/password" element={<Password />} />

        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/dashboard" element={<Navigate to="/admin" replace />} />
        <Route path="/admin/bookings" element={<AdminBookings />} />
        <Route path="/admin/reviews" element={<AdminReviews />} />
        <Route path="/admin/messages" element={<AdminMessages />} />

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

export default App;
