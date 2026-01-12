import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import PropTypes from 'prop-types';

export default function PrivateRoute({ children }) {
    const { user } = useAuth();
    return user ? children : <Navigate to="/login" />;
}

PrivateRoute.propTypes = {
    children: PropTypes.node.isRequired,
};
