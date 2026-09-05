import { api } from "./api";
import type {
  SpecialEvent,
  SpecialEventListResponse,
  SpecialEventRequest,
} from "../types/specialEvent";

const eventsBase = (businessId: string) => `/businesses/${businessId}/events`;

export const specialEventService = {
  /**
   * Every event for a business, soonest first.
   *
   * Pass a date range to restrict it — matched on the event's own date, so an event running
   * past midnight belongs to the night it opened rather than the morning after.
   */
  async getEvents(
    businessId: string,
    startDate?: string,
    endDate?: string
  ): Promise<SpecialEvent[]> {
    const query = startDate && endDate ? `?startDate=${startDate}&endDate=${endDate}` : "";
    const response = await api.get<SpecialEventListResponse>(`${eventsBase(businessId)}${query}`);
    return response.events;
  },

  async getEventById(businessId: string, id: string): Promise<SpecialEvent> {
    return api.get<SpecialEvent>(`${eventsBase(businessId)}/${id}`);
  },

  /**
   * Create an event.
   *
   * Rejected with a 400 when a requirement names a group the business does not have. That
   * is deliberate rather than lenient: an unknown name would match no employees, so the
   * event would generate quietly understaffed with nothing to explain why.
   */
  async createEvent(businessId: string, request: SpecialEventRequest): Promise<SpecialEvent> {
    return api.post<SpecialEvent, SpecialEventRequest>(eventsBase(businessId), request);
  },

  /**
   * Replace an event definition.
   *
   * The whole definition is sent, so requirements are replaced rather than merged — a group
   * removed in the form disappears instead of lingering because nothing mentioned it.
   */
  async updateEvent(
    businessId: string,
    id: string,
    request: SpecialEventRequest
  ): Promise<SpecialEvent> {
    return api.put<SpecialEvent, SpecialEventRequest>(`${eventsBase(businessId)}/${id}`, request);
  },

  async deleteEvent(businessId: string, id: string): Promise<void> {
    return api.delete<void>(`${eventsBase(businessId)}/${id}`);
  },
};
