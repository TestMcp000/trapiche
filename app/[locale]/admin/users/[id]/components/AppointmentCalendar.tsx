'use client';

/**
 * Appointment Calendar Component
 *
 * Month view calendar for user appointments.
 * Uses date-fns for date manipulation (no heavy 3rd-party calendar libs).
 * Uses admin i18n via useTranslations (parent provides NextIntlClientProvider).
 *
 * @module app/[locale]/admin/users/[id]/components/AppointmentCalendar
 */

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  eachDayOfInterval,
  isSameMonth,
  isToday,
} from 'date-fns';
import { zhTW, enUS } from 'date-fns/locale';
import type { UserAppointmentSummary } from '@/lib/types/user';
import AppointmentModal from './AppointmentModal';

interface AppointmentCalendarProps {
  appointments: UserAppointmentSummary[];
  userId: string;
  routeLocale: string;
  isOwner: boolean;
}

export default function AppointmentCalendar({
  appointments,
  userId,
  routeLocale,
  isOwner,
}: AppointmentCalendarProps) {
  const router = useRouter();
  const t = useTranslations('admin.users.detail');
  
  // Get weekdays from translation (returns array)
  const weekDays = t.raw('weekDays') as string[];
  
  // Determine date-fns locale based on current admin UI
  // We detect this from the translation output
  const dateLocale = weekDays[0] === '日' ? zhTW : enUS;
  const isZh = weekDays[0] === '日';

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<UserAppointmentSummary | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Get days to display (including padding from adjacent months)
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentMonth]);

  // Group appointments by date for quick lookup
  const appointmentsByDate = useMemo(() => {
    const map = new Map<string, UserAppointmentSummary[]>();
    appointments.forEach((apt) => {
      const dateKey = format(new Date(apt.startAt), 'yyyy-MM-dd');
      const existing = map.get(dateKey) || [];
      existing.push(apt);
      map.set(dateKey, existing);
    });
    return map;
  }, [appointments]);

  const handleDayClick = (day: Date) => {
    setSelectedDate(day);
    setSelectedAppointment(null);
    setShowModal(true);
  };

  const handleAppointmentClick = (apt: UserAppointmentSummary, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedDate(new Date(apt.startAt));
    setSelectedAppointment(apt);
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setSelectedAppointment(null);
    setSelectedDate(null);
  };

  const handleModalSuccess = () => {
    setShowModal(false);
    setSelectedAppointment(null);
    setSelectedDate(null);
    router.refresh();
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          {t('appointmentCalendar')}
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            aria-label={t('previousMonth')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-lg font-medium text-gray-900 dark:text-white min-w-[140px] text-center">
            {format(currentMonth, isZh ? 'yyyy年 M月' : 'MMMM yyyy', { locale: dateLocale })}
          </span>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            aria-label={t('nextMonth')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Week Days Header */}
      <div className="grid grid-cols-7 border-b border-gray-100 dark:border-gray-700">
        {weekDays.map((day: string) => (
          <div
            key={day}
            className="py-2 text-center text-sm font-medium text-gray-500 dark:text-gray-400"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7">
        {calendarDays.map((day) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const dayAppointments = appointmentsByDate.get(dateKey) || [];
          const inCurrentMonth = isSameMonth(day, currentMonth);
          const today = isToday(day);

          return (
            <div
              key={dateKey}
              onClick={() => isOwner && handleDayClick(day)}
              className={`
                min-h-[80px] p-1 border-b border-r border-gray-100 dark:border-gray-700
                ${inCurrentMonth ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-850'}
                ${isOwner ? 'cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20' : ''}
                transition-colors
              `}
            >
              <div
                className={`
                  text-sm font-medium mb-1 w-7 h-7 flex items-center justify-center rounded-full
                  ${!inCurrentMonth ? 'text-gray-400 dark:text-gray-600' : 'text-gray-900 dark:text-white'}
                  ${today ? 'bg-blue-600 text-white' : ''}
                `}
              >
                {format(day, 'd')}
              </div>

              {/* Appointment Indicators */}
              <div className="space-y-1">
                {dayAppointments.slice(0, 2).map((apt) => (
                  <button
                    key={apt.id}
                    onClick={(e) => handleAppointmentClick(apt, e)}
                    className="w-full text-left text-xs px-1 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded truncate hover:bg-blue-200 dark:hover:bg-blue-800/60 transition-colors"
                    title={`${format(new Date(apt.startAt), 'HH:mm')} ${apt.note || ''}`}
                  >
                    {format(new Date(apt.startAt), 'HH:mm')}
                    {apt.note && ` ${apt.note}`}
                  </button>
                ))}
                {dayAppointments.length > 2 && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 px-1">
                    +{dayAppointments.length - 2} {t('more')}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      {isOwner && (
        <div className="p-4 border-t border-gray-100 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('clickToAdd')}
          </p>
        </div>
      )}

      {/* Modal */}
      {showModal && selectedDate && (
        <AppointmentModal
          appointment={selectedAppointment}
          userId={userId}
          routeLocale={routeLocale}
          isOwner={isOwner}
          selectedDate={selectedDate}
          onClose={handleModalClose}
          onSuccess={handleModalSuccess}
        />
      )}
    </div>
  );
}

