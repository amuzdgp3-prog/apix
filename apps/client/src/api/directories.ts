import { api } from "./client";
import type {
  Location,
  LocationCreate,
  LocationUpdate,
  Route,
  RouteCreate,
  RouteUpdate,
  MachineType,
  MachineTypeCreate,
  MachineTypeUpdate,
  Toy,
  ToyCreate,
  ToyUpdate,
  Staff,
  StaffCreate,
  StaffUpdate,
} from "@apix/shared";

// ---- Locations ----
export const fetchLocations = () => api.get<Location[]>("/locations");
export const createLocation = (data: LocationCreate) =>
  api.post<Location>("/locations", data);
export const updateLocation = (id: number, data: LocationUpdate) =>
  api.put<Location>(`/locations/${id}`, data);
export const deleteLocation = (id: number) =>
  api.delete<void>(`/locations/${id}`);

// ---- Routes ----
export const fetchRoutes = () => api.get<Route[]>("/routes");
export const createRoute = (data: RouteCreate) =>
  api.post<Route>("/routes", data);
export const updateRoute = (id: number, data: RouteUpdate) =>
  api.put<Route>(`/routes/${id}`, data);
export const deleteRoute = (id: number) =>
  api.delete<void>(`/routes/${id}`);

// ---- MachineTypes ----
export const fetchMachineTypes = () => api.get<MachineType[]>("/machine-types");
export const createMachineType = (data: MachineTypeCreate) =>
  api.post<MachineType>("/machine-types", data);
export const updateMachineType = (id: number, data: MachineTypeUpdate) =>
  api.put<MachineType>(`/machine-types/${id}`, data);
export const deleteMachineType = (id: number) =>
  api.delete<void>(`/machine-types/${id}`);

// ---- MachineType Toys (базовый набор игрушек типа) ----
export const fetchMachineTypeToys = (typeId: number) =>
  api.get<Toy[]>(`/machine-types/${typeId}/toys`);
export const addMachineTypeToy = (typeId: number, toyId: number) =>
  api.post<void>(`/machine-types/${typeId}/toys`, { toyId });
export const removeMachineTypeToy = (typeId: number, toyId: number) =>
  api.delete<void>(`/machine-types/${typeId}/toys/${toyId}`);

// ---- Toys ----
export const fetchToys = () => api.get<Toy[]>("/toys");
export const createToy = (data: ToyCreate) =>
  api.post<Toy>("/toys", data);
export const updateToy = (id: number, data: ToyUpdate) =>
  api.put<Toy>(`/toys/${id}`, data);
export const deleteToy = (id: number) =>
  api.delete<void>(`/toys/${id}`);

// ---- Staff ----
export const fetchStaff = () => api.get<Staff[]>("/staff");
export const createStaff = (data: StaffCreate) =>
  api.post<Staff>("/staff", data);
export const updateStaff = (id: number, data: StaffUpdate) =>
  api.put<Staff>(`/staff/${id}`, data);
export const deleteStaff = (id: number) =>
  api.delete<void>(`/staff/${id}`);