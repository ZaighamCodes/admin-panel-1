import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import doctorActivationReducer from './slices/doctorActivationSlice';
import patientsReducer from './slices/patientsSlice';
import doctorsReducer from './slices/doctorsSlice';
import paymentsReducer from './slices/paymentsSlice';
import notificationsReducer from './slices/notificationsSlice';
import departmentsReducer from './slices/departmentsSlice';
import qualificationsReducer from './slices/qualificationsSlice';
import doctorVerificationReducer from './slices/doctorVerificationSlice';
import verifiedDoctorsReducer from './slices/verifiedDoctorsSlice';
import rejectedApplicationsReducer from './slices/rejectedApplicationsSlice';
import contentReducer from './slices/contentSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    doctorActivation: doctorActivationReducer,
    patients: patientsReducer,
    doctors: doctorsReducer,
    payments: paymentsReducer,
    notifications: notificationsReducer,
    departments: departmentsReducer,
    qualifications: qualificationsReducer,
    doctorVerification: doctorVerificationReducer,
    verifiedDoctors: verifiedDoctorsReducer,
    rejectedApplications: rejectedApplicationsReducer,
    content: contentReducer,
  },
});

