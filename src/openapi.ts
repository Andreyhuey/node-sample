import {
  extendZodWithOpenApi,
  OpenApiGeneratorV3,
  OpenAPIRegistry,
  type RouteConfig,
} from '@asteasolutions/zod-to-openapi';
import { z, type ZodTypeAny } from 'zod';
import {
  createAppointmentSchema,
  listAppointmentsQuery,
  updateStatusSchema,
} from './modules/appointments/appointments.schemas';
import { loginSchema, passwordSchema, registerSchema } from './modules/auth/auth.schemas';
import {
  createDoctorSchema,
  listDoctorsQuery,
  updateDoctorSchema,
} from './modules/doctors/doctors.schemas';
import { idParam } from './modules/params';
import {
  createPatientSchema,
  listPatientsQuery,
  updatePatientSchema,
} from './modules/patients/patients.schemas';
import { createPrescriptionSchema } from './modules/prescriptions/prescriptions.schemas';

extendZodWithOpenApi(z);

// The request side of the spec reuses the exact Zod schemas the routes
// validate with, so the docs can't drift from the code. Response shapes are
// declared below, and test/openapi.test.ts checks real responses against them.

const timestamps = { createdAt: z.string().datetime(), updatedAt: z.string().datetime() };

export const PatientResponse = z
  .object({
    id: z.string().uuid(),
    firstName: z.string(),
    lastName: z.string(),
    email: z.string().email(),
    phone: z.string().nullable(),
    dateOfBirth: z.string().date(),
    ...timestamps,
  })
  .openapi('Patient');

export const DoctorResponse = z
  .object({
    id: z.string().uuid(),
    firstName: z.string(),
    lastName: z.string(),
    email: z.string().email(),
    specialty: z.string(),
    ...timestamps,
  })
  .openapi('Doctor');

export const AppointmentResponse = z
  .object({
    id: z.string().uuid(),
    patientId: z.string().uuid(),
    doctorId: z.string().uuid(),
    startsAt: z.string().datetime(),
    endsAt: z.string().datetime(),
    status: z.enum(['scheduled', 'completed', 'cancelled', 'no_show']),
    reason: z.string().nullable(),
    ...timestamps,
  })
  .openapi('Appointment');

export const PrescriptionResponse = z
  .object({
    id: z.string().uuid(),
    appointmentId: z.string().uuid(),
    medication: z.string(),
    dosage: z.string(),
    frequency: z.string(),
    durationDays: z.number().int(),
    notes: z.string().nullable(),
    ...timestamps,
  })
  .openapi('Prescription');

export const UserResponse = z
  .object({
    id: z.string().uuid(),
    email: z.string().email(),
    role: z.enum(['admin', 'doctor', 'patient']),
    doctorId: z.string().uuid().nullable(),
    patientId: z.string().uuid().nullable(),
    ...timestamps,
  })
  .openapi('User');

export const SessionResponse = z
  .object({ accessToken: z.string(), user: UserResponse })
  .openapi('Session');

export const ErrorResponse = z
  .object({
    error: z.object({
      code: z.string(),
      message: z.string(),
      details: z.record(z.array(z.string())).optional(),
    }),
  })
  .openapi('Error');

export const page = <T extends ZodTypeAny>(item: T) =>
  z.object({ data: z.array(item), nextCursor: z.string().nullable() });

const registry = new OpenAPIRegistry();

const bearer = registry.registerComponent('securitySchemes', 'bearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
});
const secured = [{ [bearer.name]: [] }];

const json = (schema: ZodTypeAny, description: string) => ({
  description,
  content: { 'application/json': { schema } },
});
const error = (description: string) => json(ErrorResponse, description);
const body = (schema: ZodTypeAny) => ({
  body: { content: { 'application/json': { schema } } },
});

// Common error responses, merged into each route.
const standardErrors = {
  400: error('Invalid request'),
  401: error('Missing or invalid access token'),
  403: error('Not allowed for this role or record'),
};

function route(config: RouteConfig & { public?: boolean }) {
  const { public: isPublic, ...rest } = config;
  registry.registerPath({
    ...rest,
    security: isPublic ? undefined : secured,
    responses: isPublic
      ? { 400: standardErrors[400], ...rest.responses }
      : { ...standardErrors, ...rest.responses },
  });
}

// ---- auth
route({
  method: 'post',
  path: '/auth/register',
  tags: ['Auth'],
  summary: 'Sign up as a patient',
  public: true,
  request: body(registerSchema),
  responses: {
    201: json(SessionResponse, 'Account created. Also sets the refresh_token cookie.'),
    409: error('Email already registered'),
    429: error('Too many attempts'),
  },
});
route({
  method: 'post',
  path: '/auth/login',
  tags: ['Auth'],
  summary: 'Log in',
  public: true,
  request: body(loginSchema),
  responses: {
    200: json(SessionResponse, 'Logged in. Also sets the refresh_token cookie.'),
    401: error('Email or password is incorrect'),
    429: error('Too many attempts'),
  },
});
route({
  method: 'post',
  path: '/auth/refresh',
  tags: ['Auth'],
  summary: 'Swap the refresh_token cookie for a new access token',
  description:
    'Rotates the refresh token. Reusing an old refresh token ends all sessions for that user.',
  public: true,
  responses: {
    200: json(SessionResponse, 'New access token and refresh cookie'),
    401: error('Refresh token missing, expired, revoked or reused'),
  },
});
route({
  method: 'post',
  path: '/auth/logout',
  tags: ['Auth'],
  summary: 'Revoke the refresh token',
  public: true,
  responses: { 204: { description: 'Logged out' } },
});
route({
  method: 'get',
  path: '/auth/me',
  tags: ['Auth'],
  summary: 'The logged-in user',
  responses: { 200: json(UserResponse, 'Current user') },
});

// ---- patients
route({
  method: 'get',
  path: '/patients',
  tags: ['Patients'],
  summary: 'List patients (admin, doctor)',
  request: { query: listPatientsQuery },
  responses: { 200: json(page(PatientResponse), 'A page of patients') },
});
route({
  method: 'post',
  path: '/patients',
  tags: ['Patients'],
  summary: 'Register a patient without an account (admin)',
  request: body(createPatientSchema),
  responses: {
    201: json(PatientResponse, 'Created'),
    409: error('Email already exists'),
  },
});
route({
  method: 'get',
  path: '/patients/{id}',
  tags: ['Patients'],
  summary: 'Get a patient (staff, or the patient themself)',
  request: { params: idParam },
  responses: { 200: json(PatientResponse, 'The patient'), 404: error('Not found') },
});
route({
  method: 'patch',
  path: '/patients/{id}',
  tags: ['Patients'],
  summary: 'Update a patient (admin, or the patient themself except email)',
  request: { params: idParam, ...body(updatePatientSchema) },
  responses: { 200: json(PatientResponse, 'Updated'), 404: error('Not found') },
});
route({
  method: 'delete',
  path: '/patients/{id}',
  tags: ['Patients'],
  summary: 'Delete a patient with no appointment history (admin)',
  request: { params: idParam },
  responses: {
    204: { description: 'Deleted' },
    404: error('Not found'),
    409: error('Patient has appointments'),
  },
});
route({
  method: 'get',
  path: '/patients/{id}/prescriptions',
  tags: ['Patients'],
  summary: "A patient's prescriptions across all visits",
  request: { params: idParam },
  responses: {
    200: json(
      z.array(PrescriptionResponse.extend({ doctorId: z.string().uuid() })),
      'Prescriptions, newest first',
    ),
  },
});

// ---- doctors
route({
  method: 'get',
  path: '/doctors',
  tags: ['Doctors'],
  summary: 'List doctors (public)',
  public: true,
  request: { query: listDoctorsQuery },
  responses: { 200: json(page(DoctorResponse), 'A page of doctors') },
});
route({
  method: 'get',
  path: '/doctors/{id}',
  tags: ['Doctors'],
  summary: 'Get a doctor (public)',
  public: true,
  request: { params: idParam },
  responses: { 200: json(DoctorResponse, 'The doctor'), 404: error('Not found') },
});
route({
  method: 'post',
  path: '/doctors',
  tags: ['Doctors'],
  summary: 'Add a doctor (admin)',
  request: body(createDoctorSchema),
  responses: { 201: json(DoctorResponse, 'Created'), 409: error('Email already exists') },
});
route({
  method: 'patch',
  path: '/doctors/{id}',
  tags: ['Doctors'],
  summary: 'Update a doctor (admin)',
  request: { params: idParam, ...body(updateDoctorSchema) },
  responses: { 200: json(DoctorResponse, 'Updated'), 404: error('Not found') },
});
route({
  method: 'post',
  path: '/doctors/{id}/account',
  tags: ['Doctors'],
  summary: 'Give a doctor a login using their email (admin)',
  request: { params: idParam, ...body(z.object({ password: passwordSchema })) },
  responses: { 201: json(UserResponse, 'Account created'), 409: error('Account exists') },
});

// ---- appointments
route({
  method: 'get',
  path: '/appointments',
  tags: ['Appointments'],
  summary: 'List appointments',
  description: 'Doctors and patients only ever see their own appointments.',
  request: { query: listAppointmentsQuery.innerType() },
  responses: { 200: json(page(AppointmentResponse), 'A page of appointments') },
});
route({
  method: 'post',
  path: '/appointments',
  tags: ['Appointments'],
  summary: 'Book an appointment (admin, or a patient for themself)',
  request: body(createAppointmentSchema),
  responses: {
    201: json(AppointmentResponse, 'Booked'),
    404: error('Patient or doctor not found'),
    409: error('Doctor already has an appointment at that time'),
    422: error('Appointment is in the past'),
  },
});
route({
  method: 'get',
  path: '/appointments/{id}',
  tags: ['Appointments'],
  summary: 'Get an appointment (admin or a participant)',
  request: { params: idParam },
  responses: {
    200: json(AppointmentResponse, 'The appointment'),
    404: error('Not found'),
  },
});
route({
  method: 'patch',
  path: '/appointments/{id}/status',
  tags: ['Appointments'],
  summary: 'Complete, cancel or mark no-show',
  description: 'Only scheduled appointments can change. Patients can only cancel.',
  request: { params: idParam, ...body(updateStatusSchema) },
  responses: {
    200: json(AppointmentResponse, 'Updated'),
    404: error('Not found'),
    422: error('Appointment is no longer scheduled'),
  },
});
route({
  method: 'get',
  path: '/appointments/{id}/prescriptions',
  tags: ['Prescriptions'],
  summary: "An appointment's prescriptions",
  request: { params: idParam },
  responses: { 200: json(z.array(PrescriptionResponse), 'Prescriptions') },
});
route({
  method: 'post',
  path: '/appointments/{id}/prescriptions',
  tags: ['Prescriptions'],
  summary: "Prescribe (the appointment's doctor only)",
  request: { params: idParam, ...body(createPrescriptionSchema) },
  responses: {
    201: json(PrescriptionResponse, 'Created'),
    404: error('Appointment not found'),
    422: error('Appointment is not completed'),
  },
});

// ---- health
route({
  method: 'get',
  path: '/health',
  tags: ['Health'],
  summary: 'Liveness check',
  public: true,
  responses: {
    200: json(z.object({ status: z.literal('ok'), uptime: z.number() }), 'Healthy'),
  },
});

export function buildOpenApiDocument() {
  return new OpenApiGeneratorV3(registry.definitions).generateDocument({
    openapi: '3.0.3',
    info: {
      title: 'Clinic API',
      version: '1.0.0',
      description:
        'Patients, doctors, appointment booking and prescriptions. ' +
        'Log in with POST /auth/login, then click Authorize and paste the accessToken.',
    },
  });
}
