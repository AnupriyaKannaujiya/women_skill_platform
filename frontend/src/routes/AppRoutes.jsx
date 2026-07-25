import { Routes, Route } from "react-router-dom";

import Home from "../pages/public/Home";
import About from "../pages/public/About";
import Providers from "../pages/public/Providers";
import Contact from "../pages/public/Contact";
import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";
import NotFound from "../pages/public/NotFound";
import ProtectedRoute from "./ProtectedRoute";
import ProviderDashboard from "../pages/provider/ProviderDashboard";
import EditProfile from "../pages/provider/EditProfile";
import Portfolio from "../pages/provider/Portfolio";
import ProviderDetails from "../pages/public/ProviderDetails";
import Booking from "../pages/customer/Booking";
import CustomerDashboard from "../pages/customer/CustomerDashboard";
import Review from "../pages/customer/Review";
import CustomerEditProfile from "../pages/customer/CustomerEditProfile";
import AdminDashboard from "../pages/admin/AdminDashboard";
import AdminBookings from "../pages/admin/AdminBookings";
import AdminReviews from "../pages/admin/AdminReviews";

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route
        path="/about"
        element={
          <ProtectedRoute>
            <About />
          </ProtectedRoute>
        }
      />
      <Route path="/providers" element={<Providers />} />
      <Route path="/providers/:id" element={<ProviderDetails />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/provider/dashboard"
        element={
          <ProtectedRoute>
            <ProviderDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/provider/edit-profile"
        element={
          <ProtectedRoute>
            <EditProfile />
          </ProtectedRoute>
        }
      />
      <Route path="/provider/portfolio" element={<Portfolio />} />
      <Route
        path="/booking/:id"
        element={
          <ProtectedRoute>
            <Booking />
          </ProtectedRoute>
        }
      />
      <Route
        path="/customer/dashboard"
        element={
          <ProtectedRoute>
            <CustomerDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/customer/edit-profile"
        element={
          <ProtectedRoute>
            <CustomerEditProfile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/review/:id"
        element={
          <ProtectedRoute>
            <Review />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route path="/admin/bookings" element={<AdminBookings />} />
      <Route path="/admin/reviews" element={<AdminReviews />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default AppRoutes;
