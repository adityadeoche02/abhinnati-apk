import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView, Switch, TextInput, Alert, ActivityIndicator, Modal, FlatList } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, Clock, MapPin, AlertCircle, Plus, Trash2, ShieldAlert, ArrowLeft } from 'lucide-react-native';

import { api } from '../../api/client';
import { useAuthStore } from '../../store/useAuthStore';
import { theme } from '../../constants/theme';
import { RootStackParamList } from '../../navigation/types';

type NavigationProp = StackNavigationProp<RootStackParamList>;

interface DayConfig {
  closed: boolean;
  startTime: string;
  endTime: string;
}

interface WeeklyHours {
  [day: string]: DayConfig;
}

export const ManageAvailabilityScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { preferredLanguage } = useAuthStore();
  const isMr = preferredLanguage === 'mr';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 1. Weekly hours state
  const [weeklyHours, setWeeklyHours] = useState<WeeklyHours>({
    Monday: { closed: false, startTime: '09:00 AM', endTime: '06:00 PM' },
    Tuesday: { closed: false, startTime: '09:00 AM', endTime: '06:00 PM' },
    Wednesday: { closed: false, startTime: '09:00 AM', endTime: '06:00 PM' },
    Thursday: { closed: false, startTime: '09:00 AM', endTime: '06:00 PM' },
    Friday: { closed: false, startTime: '09:00 AM', endTime: '06:00 PM' },
    Saturday: { closed: false, startTime: '09:00 AM', endTime: '06:00 PM' },
    Sunday: { closed: true, startTime: '09:00 AM', endTime: '06:00 PM' },
  });

  // 2. Vacation Mode state
  const todayStr = new Date().toISOString().split('T')[0];
  const nextWeekStr = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [vacationMode, setVacationMode] = useState(false);
  const [vacationStart, setVacationStart] = useState(todayStr);
  const [vacationEnd, setVacationEnd] = useState(nextWeekStr);
  const [vacationReason, setVacationReason] = useState('');

  // 3. Block Dates state
  const [blockedDates, setBlockedDates] = useState<{ date: string; reason?: string }[]>([]);
  const [newBlockDate, setNewBlockDate] = useState(todayStr);
  const [newBlockDateReason, setNewBlockDateReason] = useState('');

  // 4. Block Slots state
  const [blockedSlots, setBlockedSlots] = useState<{ date: string; startTime: string; endTime: string; reason?: string }[]>([]);
  const [newBlockSlotDate, setNewBlockSlotDate] = useState(todayStr);
  const [newBlockSlotStart, setNewBlockSlotStart] = useState('02:00 PM');
  const [newBlockSlotEnd, setNewBlockSlotEnd] = useState('05:00 PM');
  const [newBlockSlotReason, setNewBlockSlotReason] = useState('');

  // 5. Service Radius state
  const [serviceRadius, setServiceRadius] = useState('5 km');

  // 6. Emergency availability state
  const [emergencyStatus, setEmergencyStatus] = useState<string | null>(null);

  // Time Picker Modal State
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [timePickerTarget, setTimePickerTarget] = useState<'weeklyHours' | 'blockSlotStart' | 'blockSlotEnd' | null>(null);
  const [pickerDay, setPickerDay] = useState<string | null>(null);
  const [pickerField, setPickerField] = useState<'startTime' | 'endTime' | null>(null);
  const [tempHour, setTempHour] = useState('09');
  const [tempMinute, setTempMinute] = useState('00');
  const [tempAmPm, setTempAmPm] = useState('AM');

  // Date Picker Modal State
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [dateTarget, setDateTarget] = useState<'vacationStart' | 'vacationEnd' | 'blockDate' | 'blockSlotDate' | null>(null);
  const [selYear, setSelYear] = useState(2026);
  const [selMonth, setSelMonth] = useState(6); // 0-indexed, July = 6
  const [selDay, setSelDay] = useState(15);

  const openTimePicker = (target: 'weeklyHours' | 'blockSlotStart' | 'blockSlotEnd', currentVal: string, day?: string, field?: 'startTime' | 'endTime') => {
    setTimePickerTarget(target);
    setPickerDay(day || null);
    setPickerField(field || null);
    
    const match = currentVal.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (match) {
      setTempHour(match[1]);
      setTempMinute(match[2]);
      setTempAmPm(match[3].toUpperCase());
    } else {
      setTempHour('09');
      setTempMinute('00');
      setTempAmPm('AM');
    }
    setTimePickerVisible(true);
  };

  const confirmTimeSelection = () => {
    const formattedTime = `${tempHour.padStart(2, '0')}:${tempMinute.padStart(2, '0')} ${tempAmPm}`;
    if (timePickerTarget === 'weeklyHours' && pickerDay && pickerField) {
      handleTimeChange(pickerDay, pickerField, formattedTime);
    } else if (timePickerTarget === 'blockSlotStart') {
      setNewBlockSlotStart(formattedTime);
    } else if (timePickerTarget === 'blockSlotEnd') {
      setNewBlockSlotEnd(formattedTime);
    }
    setTimePickerVisible(false);
  };

  const openDatePicker = (target: 'vacationStart' | 'vacationEnd' | 'blockDate' | 'blockSlotDate', currentVal: string) => {
    setDateTarget(target);
    const match = currentVal.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const y = parseInt(match[1], 10);
      const m = parseInt(match[2], 10) - 1; // 0-indexed
      const d = parseInt(match[3], 10);
      setSelYear(y);
      setSelMonth(m);
      setSelDay(d);
    } else {
      setSelYear(2026);
      setSelMonth(6);
      setSelDay(15);
    }
    setDatePickerVisible(true);
  };

  const confirmDateSelection = (day: number) => {
    const formattedDate = `${selYear}-${String(selMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (dateTarget === 'vacationStart') {
      setVacationStart(formattedDate);
    } else if (dateTarget === 'vacationEnd') {
      setVacationEnd(formattedDate);
    } else if (dateTarget === 'blockDate') {
      setNewBlockDate(formattedDate);
    } else if (dateTarget === 'blockSlotDate') {
      setNewBlockSlotDate(formattedDate);
    }
    setDatePickerVisible(false);
  };

  // Load Availability Config from Backend
  const loadAvailability = async () => {
    try {
      const res = await api.getVendorAvailability();
      if (res.success && res.data) {
        const d = res.data;
        if (d.weeklyHours) {
          try {
            setWeeklyHours(JSON.parse(d.weeklyHours));
          } catch {}
        }
        setVacationMode(!!d.vacationMode);
        if (d.vacationStart) setVacationStart(d.vacationStart.split('T')[0]);
        if (d.vacationEnd) setVacationEnd(d.vacationEnd.split('T')[0]);
        setVacationReason(d.vacationReason || '');
        
        if (d.blockedDates) {
          try {
            setBlockedDates(JSON.parse(d.blockedDates));
          } catch {}
        }
        if (d.blockedSlots) {
          try {
            setBlockedSlots(JSON.parse(d.blockedSlots));
          } catch {}
        }
        setServiceRadius(d.serviceRadius || '5 km');
        setEmergencyStatus(d.emergencyStatus || null);
      }
    } catch (err) {
      console.warn('Failed to load availability from backend:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAvailability();
  }, []);

  // Day Toggle helper
  const handleToggleDay = (day: string) => {
    setWeeklyHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        closed: !prev[day].closed,
      }
    }));
  };

  const handleTimeChange = (day: string, type: 'startTime' | 'endTime', value: string) => {
    setWeeklyHours(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [type]: value,
      }
    }));
  };

  // Block Date actions
  const handleAddBlockDate = async () => {
    if (!newBlockDate) return;
    setSaving(true);
    try {
      await api.blockDate(newBlockDate, newBlockDateReason);
      await loadAvailability();
    } catch {
      Alert.alert('Error', 'Failed to block date.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveBlockDate = (date: string) => {
    Alert.alert(
      isMr ? 'तारीख ब्लॉक काढा?' : 'Remove Blocked Date?',
      isMr ? 'तुम्हाला खात्री आहे की तुम्ही ही ब्लॉक केलेली तारीख काढू इच्छिता?' : 'Are you sure you want to remove this blocked date?',
      [
        { text: isMr ? 'रद्द करा' : 'Cancel', style: 'cancel' },
        { 
          text: isMr ? 'काढा' : 'Delete', 
          style: 'destructive',
          onPress: async () => {
            setSaving(true);
            try {
              await api.unblockDate(date);
              await loadAvailability();
            } catch {
              Alert.alert('Error', 'Failed to unblock date.');
            } finally {
              setSaving(false);
            }
          }
        }
      ]
    );
  };

  // Block Slot actions
  const handleAddBlockSlot = async () => {
    if (!newBlockSlotDate || !newBlockSlotStart || !newBlockSlotEnd) return;
    setSaving(true);
    try {
      await api.blockSlot(newBlockSlotDate, newBlockSlotStart, newBlockSlotEnd, newBlockSlotReason);
      await loadAvailability();
    } catch {
      Alert.alert('Error', 'Failed to block slot.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveBlockSlot = (date: string, start: string, end: string) => {
    Alert.alert(
      isMr ? 'ब्लॉक केलेला स्लॉट काढा?' : 'Remove Blocked Slot?',
      isMr ? 'तुम्हाला खात्री आहे की तुम्ही हा ब्लॉक केलेला वेळ काढू इच्छिता?' : 'Are you sure you want to remove this blocked time slot?',
      [
        { text: isMr ? 'रद्द करा' : 'Cancel', style: 'cancel' },
        { 
          text: isMr ? 'काढा' : 'Delete', 
          style: 'destructive',
          onPress: async () => {
            setSaving(true);
            try {
              await api.unblockSlot(date, start, end);
              await loadAvailability();
            } catch {
              Alert.alert('Error', 'Failed to remove blocked slot.');
            } finally {
              setSaving(false);
            }
          }
        }
      ]
    );
  };

  // Save changes
  const handleSaveChanges = async () => {
    setSaving(true);
    try {
      // 1. Save Weekly hours and radius
      await api.updateVendorAvailability({
        weeklyHours: JSON.stringify(weeklyHours),
        serviceRadius,
        emergencyStatus,
      });

      // 2. Save Vacation status
      await api.updateVendorVacation({
        vacationMode,
        vacationStart: vacationMode ? new Date(vacationStart).toISOString() : null,
        vacationEnd: vacationMode ? new Date(vacationEnd).toISOString() : null,
        vacationReason: vacationMode ? vacationReason : null,
      });

      Alert.alert(
        isMr ? 'यशस्वी' : 'Success',
        isMr ? 'उपलब्धता सेटिंग्ज यशस्वीरित्या सेव्ह केल्या!' : 'Availability settings saved successfully!',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (err) {
      Alert.alert('Error', 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingCenter}>
        <ActivityIndicator size="large" color="#E58A2B" />
        <Text style={{ marginTop: 10, color: '#8A7C66' }}>
          {isMr ? 'उपलब्धता लोड होत आहे...' : 'Loading availability settings...'}
        </Text>
      </SafeAreaView>
    );
  }

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header bar */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={20} color="#2A2520" />
        </Pressable>
        <Text style={styles.headerTitle}>{isMr ? 'उपलब्धता व्यवस्थापन' : 'Manage Availability'}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        
        {/* Section 1: Weekly Hours */}
        <Text style={styles.sectionHeader}>{isMr ? '१. साप्ताहिक कामकाजाचे तास' : '1. Weekly Working Hours'}</Text>
        <View style={styles.card}>
          {days.map(day => {
            const config = weeklyHours[day] || { closed: false, startTime: '09:00 AM', endTime: '06:00 PM' };
            return (
              <View key={day} style={styles.dayRow}>
                <View style={{ width: 100 }}>
                  <Text style={styles.dayLabel}>{day}</Text>
                </View>

                {config.closed ? (
                  <Text style={styles.closedText}>{isMr ? 'बंद (Closed)' : 'Closed'}</Text>
                ) : (
                  <View style={styles.timeInputsRow}>
                    <Pressable 
                      onPress={() => openTimePicker('weeklyHours', config.startTime, day, 'startTime')}
                      style={styles.timeInputPressable}
                    >
                      <Text style={styles.timeInputText}>{config.startTime}</Text>
                    </Pressable>
                    <Text style={{ marginHorizontal: 6, color: '#8A7C66' }}>to</Text>
                    <Pressable 
                      onPress={() => openTimePicker('weeklyHours', config.endTime, day, 'endTime')}
                      style={styles.timeInputPressable}
                    >
                      <Text style={styles.timeInputText}>{config.endTime}</Text>
                    </Pressable>
                  </View>
                )}

                <Switch
                  value={!config.closed}
                  onValueChange={() => handleToggleDay(day)}
                  trackColor={{ false: theme.colors.border, true: '#D4EFDF' }}
                  thumbColor={!config.closed ? '#2E7D52' : '#F4F3F0'}
                />
              </View>
            );
          })}
        </View>

        {/* Section 2: Vacation Mode */}
        <Text style={styles.sectionHeader}>{isMr ? '२. सुट्टी मोड (Vacation Mode)' : '2. Vacation Mode'}</Text>
        <View style={styles.card}>
          <View style={styles.vacationToggleRow}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={styles.vacationLabel}>{isMr ? 'सुट्टी मोड सुरू करा' : 'Enable Vacation Mode'}</Text>
              <Text style={styles.vacationSub}>{isMr ? 'सुरू असताना सर्व बुकिंग्स तात्पुरत्या बंद राहतील.' : 'Residents cannot create bookings while active.'}</Text>
            </View>
            <Switch
              value={vacationMode}
              onValueChange={setVacationMode}
              trackColor={{ false: theme.colors.border, true: '#FADBD8' }}
              thumbColor={vacationMode ? '#C0392B' : '#F4F3F0'}
            />
          </View>

          {vacationMode && (
            <View style={{ marginTop: 14 }}>
              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.inputLabel}>Start Date</Text>
                  <Pressable 
                    onPress={() => openDatePicker('vacationStart', vacationStart)}
                    style={styles.pickerTriggerBox}
                  >
                    <Text style={styles.pickerTriggerText}>{vacationStart || 'YYYY-MM-DD'}</Text>
                  </Pressable>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>End Date</Text>
                  <Pressable 
                    onPress={() => openDatePicker('vacationEnd', vacationEnd)}
                    style={styles.pickerTriggerBox}
                  >
                    <Text style={styles.pickerTriggerText}>{vacationEnd || 'YYYY-MM-DD'}</Text>
                  </Pressable>
                </View>
              </View>

              <Text style={[styles.inputLabel, { marginTop: 10 }]}>Reason (Optional)</Text>
              <TextInput
                value={vacationReason}
                onChangeText={setVacationReason}
                placeholder="e.g. Family Trip, Medical Leave"
                placeholderTextColor="#A89A82"
                style={styles.textInput}
              />
            </View>
          )}
        </View>

        {/* Section 3: Block Specific Dates */}
        <Text style={styles.sectionHeader}>{isMr ? '३. विशिष्ट तारखा ब्लॉक करा' : '3. Block Specific Dates'}</Text>
        <View style={styles.card}>
          <View style={styles.addBlockRow}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Pressable 
                onPress={() => openDatePicker('blockDate', newBlockDate)}
                style={styles.pickerTriggerBoxMini}
              >
                <Text style={styles.pickerTriggerTextMini}>{newBlockDate || 'YYYY-MM-DD'}</Text>
              </Pressable>
            </View>
            <View style={{ flex: 1, marginRight: 8 }}>
              <TextInput
                value={newBlockDateReason}
                onChangeText={setNewBlockDateReason}
                placeholder="Reason"
                style={styles.textInputMini}
              />
            </View>
            <Pressable onPress={handleAddBlockDate} disabled={saving} style={styles.addIconBtn}>
              <Plus size={20} color="#FFFFFF" />
            </Pressable>
          </View>

          {blockedDates.map((item, idx) => (
            <View key={idx} style={styles.blockedItemRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.blockedItemText}>{item.date}</Text>
                {item.reason ? <Text style={styles.blockedItemReason}>{item.reason}</Text> : null}
              </View>
              <Pressable onPress={() => handleRemoveBlockDate(item.date)} style={styles.deleteIconBtn}>
                <Trash2 size={16} color="#C0392B" />
              </Pressable>
            </View>
          ))}
        </View>

        {/* Section 4: Block Time Slots */}
        <Text style={styles.sectionHeader}>{isMr ? '४. विशिष्ट तास ब्लॉक करा' : '4. Block Time Slots'}</Text>
        <View style={styles.card}>
          <View style={{ marginBottom: 12 }}>
            <Text style={styles.inputLabel}>Date</Text>
            <Pressable 
              onPress={() => openDatePicker('blockSlotDate', newBlockSlotDate)}
              style={styles.pickerTriggerBox}
            >
              <Text style={styles.pickerTriggerText}>{newBlockSlotDate || 'YYYY-MM-DD'}</Text>
            </Pressable>
          </View>
          
          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.inputLabel}>Start Time</Text>
              <Pressable 
                onPress={() => openTimePicker('blockSlotStart', newBlockSlotStart)}
                style={styles.pickerTriggerBox}
              >
                <Text style={styles.pickerTriggerText}>{newBlockSlotStart || 'e.g. 02:00 PM'}</Text>
              </Pressable>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>End Time</Text>
              <Pressable 
                onPress={() => openTimePicker('blockSlotEnd', newBlockSlotEnd)}
                style={styles.pickerTriggerBox}
              >
                <Text style={styles.pickerTriggerText}>{newBlockSlotEnd || 'e.g. 05:00 PM'}</Text>
              </Pressable>
            </View>
          </View>

          <View style={{ marginTop: 10, marginBottom: 14 }}>
            <Text style={styles.inputLabel}>Reason (Optional)</Text>
            <TextInput
              value={newBlockSlotReason}
              onChangeText={setNewBlockSlotReason}
              placeholder="e.g. Doctor appointment"
              placeholderTextColor="#A89A82"
              style={styles.textInput}
            />
          </View>

          <Pressable onPress={handleAddBlockSlot} disabled={saving} style={styles.addSlotBtn}>
            <Text style={styles.addSlotBtnText}>+ Add Blocked Slot</Text>
          </Pressable>

          {blockedSlots.map((item, idx) => (
            <View key={idx} style={styles.blockedItemRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.blockedItemText}>{item.date} · {item.startTime} – {item.endTime}</Text>
                {item.reason ? <Text style={styles.blockedItemReason}>{item.reason}</Text> : null}
              </View>
              <Pressable onPress={() => handleRemoveBlockSlot(item.date, item.startTime, item.endTime)} style={styles.deleteIconBtn}>
                <Trash2 size={16} color="#C0392B" />
              </Pressable>
            </View>
          ))}
        </View>

        {/* Section 5: Service Radius */}
        <Text style={styles.sectionHeader}>{isMr ? '५. सेवा त्रिज्या (Service Radius)' : '5. Service Radius'}</Text>
        <View style={styles.card}>
          <Text style={styles.inputLabel}>Select coverage area from shop</Text>
          <View style={styles.radiusGrid}>
            {['2 km', '5 km', '10 km', '15 km', '20 km', 'Entire City'].map(rad => {
              const isActive = serviceRadius === rad;
              return (
                <Pressable
                  key={rad}
                  onPress={() => setServiceRadius(rad)}
                  style={[styles.radiusChip, isActive && styles.radiusChipActive]}
                >
                  <Text style={[styles.radiusChipText, isActive && styles.radiusChipTextActive]}>{rad}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Section 6: Emergency availability */}
        <Text style={styles.sectionHeader}>{isMr ? '६. आपत्कालीन कृती' : '6. Emergency Availability'}</Text>
        <View style={styles.card}>
          <Text style={styles.inputLabel}>Quick Actions to override schedule</Text>
          <View style={styles.emergencyGrid}>
            {[
              { id: 'available_now', text: isMr ? 'आताच उपलब्ध' : 'Available Now', color: '#2E7D52' },
              { id: 'unavailable_today', text: isMr ? 'आज अनुपलब्ध' : 'Unavailable Today', color: '#C0392B' },
              { id: 'close_early', text: isMr ? 'लवकर बंद करा' : 'Close Early', color: '#E58A2B' },
              { id: 'open_extra', text: isMr ? 'जादा वेळ चालू' : 'Open Extra Hours', color: '#2980B9' },
            ].map(act => {
              const isActive = emergencyStatus === act.id;
              return (
                <Pressable
                  key={act.id}
                  onPress={() => setEmergencyStatus(isActive ? null : act.id)}
                  style={[
                    styles.emergencyChip,
                    { borderColor: act.color },
                    isActive && { backgroundColor: act.color }
                  ]}
                >
                  <Text style={[styles.emergencyChipText, { color: isActive ? '#FFFFFF' : act.color }]}>{act.text}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Save button */}
        <Pressable onPress={handleSaveChanges} disabled={saving} style={styles.saveBtn}>
          {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveBtnText}>{isMr ? 'बदल सेव्ह करा' : 'Save Changes'}</Text>}
        </Pressable>
      </ScrollView>

      {/* Time Picker Modal */}
      <Modal visible={timePickerVisible} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{isMr ? 'वेळ निवडा' : 'Select Time'}</Text>
            
            <View style={styles.pickerRow}>
              {/* Hour list */}
              <View style={styles.pickerColumn}>
                <Text style={styles.pickerColumnHeader}>{isMr ? 'तास' : 'Hour'}</Text>
                <FlatList
                  data={['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12']}
                  keyExtractor={item => item}
                  style={{ maxHeight: 150 }}
                  renderItem={({ item }) => (
                    <Pressable 
                      onPress={() => setTempHour(item)}
                      style={[styles.pickerValueRow, tempHour === item && styles.pickerValueRowActive]}
                    >
                      <Text style={[styles.pickerValueText, tempHour === item && styles.pickerValueTextActive]}>{item}</Text>
                    </Pressable>
                  )}
                />
              </View>

              {/* Minute list */}
              <View style={styles.pickerColumn}>
                <Text style={styles.pickerColumnHeader}>{isMr ? 'मिनिट' : 'Minute'}</Text>
                <FlatList
                  data={['00', '15', '30', '45']}
                  keyExtractor={item => item}
                  style={{ maxHeight: 150 }}
                  renderItem={({ item }) => (
                    <Pressable 
                      onPress={() => setTempMinute(item)}
                      style={[styles.pickerValueRow, tempMinute === item && styles.pickerValueRowActive]}
                    >
                      <Text style={[styles.pickerValueText, tempMinute === item && styles.pickerValueTextActive]}>{item}</Text>
                    </Pressable>
                  )}
                />
              </View>

              {/* AM / PM */}
              <View style={styles.pickerColumn}>
                <Text style={styles.pickerColumnHeader}>AM/PM</Text>
                <FlatList
                  data={['AM', 'PM']}
                  keyExtractor={item => item}
                  style={{ maxHeight: 150 }}
                  renderItem={({ item }) => (
                    <Pressable 
                      onPress={() => setTempAmPm(item)}
                      style={[styles.pickerValueRow, tempAmPm === item && styles.pickerValueRowActive]}
                    >
                      <Text style={[styles.pickerValueText, tempAmPm === item && styles.pickerValueTextActive]}>{item}</Text>
                    </Pressable>
                  )}
                />
              </View>
            </View>

            <View style={styles.modalBtnRow}>
              <Pressable onPress={() => setTimePickerVisible(false)} style={styles.modalCancelBtn}>
                <Text style={styles.modalCancelBtnText}>{isMr ? 'रद्द करा' : 'Cancel'}</Text>
              </Pressable>
              <Pressable onPress={confirmTimeSelection} style={styles.modalConfirmBtn}>
                <Text style={styles.modalConfirmBtnText}>{isMr ? 'निश्चित करा' : 'Confirm'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Date Picker Modal */}
      <Modal visible={datePickerVisible} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{isMr ? 'तारीख निवडा' : 'Select Date'}</Text>
            
            {/* Simple month/year indicator */}
            <View style={styles.monthHeaderRow}>
              <Pressable 
                onPress={() => {
                  if (selMonth === 0) {
                    setSelMonth(11);
                    setSelYear(prev => prev - 1);
                  } else {
                    setSelMonth(prev => prev - 1);
                  }
                }}
                style={styles.monthNavBtn}
              >
                <Text style={styles.monthNavBtnText}>◀</Text>
              </Pressable>
              <Text style={styles.monthLabelText}>
                {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][selMonth]} {selYear}
              </Text>
              <Pressable 
                onPress={() => {
                  if (selMonth === 11) {
                    setSelMonth(0);
                    setSelYear(prev => prev + 1);
                  } else {
                    setSelMonth(prev => prev + 1);
                  }
                }}
                style={styles.monthNavBtn}
              >
                <Text style={styles.monthNavBtnText}>▶</Text>
              </Pressable>
            </View>

            {/* Days grid selection */}
            <View style={styles.daysGrid}>
              {Array.from({ length: new Date(selYear, selMonth + 1, 0).getDate() }).map((_, idx) => {
                const dayNum = idx + 1;
                const isSelected = selDay === dayNum;
                return (
                  <Pressable 
                    key={idx} 
                    onPress={() => {
                      setSelDay(dayNum);
                      confirmDateSelection(dayNum);
                    }}
                    style={[styles.dayGridCell, isSelected && styles.dayGridCellActive]}
                  >
                    <Text style={[styles.dayGridCellText, isSelected && styles.dayGridCellTextActive]}>{dayNum}</Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable onPress={() => setDatePickerVisible(false)} style={styles.datePickerCloseBtn}>
              <Text style={styles.datePickerCloseBtnText}>{isMr ? 'बंद करा' : 'Close'}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.cream,
  },
  loadingCenter: {
    flex: 1,
    backgroundColor: theme.colors.cream,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#EFE3CC',
  },
  backBtn: {
    width: 24,
    height: 24,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.charcoal,
    fontFamily: theme.typography.fontFamily.semiBold,
  },
  scroll: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8A7C66',
    textTransform: 'uppercase',
    marginTop: 22,
    marginBottom: 8,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFE3CC',
    borderRadius: 12,
    padding: 16,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#EFE3CC',
  },
  dayLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.charcoal,
    fontFamily: theme.typography.fontFamily.medium,
  },
  closedText: {
    fontSize: 14,
    color: '#C0392B',
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  timeInputsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    marginRight: 10,
  },
  timeInput: {
    borderWidth: 1,
    borderColor: '#E0CFB0',
    borderRadius: 6,
    height: 30,
    width: 75,
    fontSize: 12,
    color: theme.colors.charcoal,
    textAlign: 'center',
    padding: 0,
    backgroundColor: '#FAF5EA',
  },
  vacationToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  vacationLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.charcoal,
  },
  vacationSub: {
    fontSize: 12,
    color: '#8A7C66',
    marginTop: 2,
  },
  row: {
    flexDirection: 'row',
  },
  inputLabel: {
    fontSize: 11,
    color: '#8A7C66',
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E0CFB0',
    borderRadius: 8,
    height: 40,
    paddingHorizontal: 12,
    fontSize: 14,
    color: theme.colors.charcoal,
    backgroundColor: '#FAF5EA',
  },
  textInputMini: {
    borderWidth: 1,
    borderColor: '#E0CFB0',
    borderRadius: 8,
    height: 38,
    paddingHorizontal: 8,
    fontSize: 13,
    color: theme.colors.charcoal,
    backgroundColor: '#FAF5EA',
  },
  addBlockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  addIconBtn: {
    backgroundColor: '#E58A2B',
    width: 38,
    height: 38,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  blockedItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#EFE3CC',
  },
  blockedItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.charcoal,
  },
  blockedItemReason: {
    fontSize: 12,
    color: '#8A7C66',
    marginTop: 2,
  },
  deleteIconBtn: {
    padding: 6,
  },
  addSlotBtn: {
    backgroundColor: '#FAF5EA',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#E0CFB0',
    borderRadius: 8,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  addSlotBtnText: {
    color: '#E58A2B',
    fontWeight: '600',
  },
  radiusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  radiusChip: {
    width: '30%',
    height: 36,
    borderWidth: 1,
    borderColor: '#E0CFB0',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  radiusChipActive: {
    backgroundColor: '#E58A2B',
    borderColor: '#E58A2B',
  },
  radiusChipText: {
    fontSize: 12,
    color: '#6B5F4E',
    fontWeight: '600',
  },
  radiusChipTextActive: {
    color: '#FFFFFF',
  },
  emergencyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  emergencyChip: {
    width: '48%',
    height: 40,
    borderWidth: 1.5,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  emergencyChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  saveBtn: {
    backgroundColor: theme.colors.charcoal,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  timeInputPressable: {
    borderWidth: 1,
    borderColor: '#E0CFB0',
    borderRadius: 6,
    width: 90,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAF5EA',
  },
  timeInputText: {
    fontSize: 14,
    color: '#2A2520',
    fontWeight: '500',
  },
  pickerTriggerBox: {
    borderWidth: 1,
    borderColor: '#E0CFB0',
    borderRadius: 8,
    height: 44,
    paddingHorizontal: 12,
    justifyContent: 'center',
    backgroundColor: '#FAF5EA',
    marginTop: 4,
  },
  pickerTriggerText: {
    fontSize: 14,
    color: '#2A2520',
  },
  pickerTriggerBoxMini: {
    borderWidth: 1,
    borderColor: '#E0CFB0',
    borderRadius: 8,
    height: 38,
    paddingHorizontal: 12,
    justifyContent: 'center',
    backgroundColor: '#FAF5EA',
  },
  pickerTriggerTextMini: {
    fontSize: 13,
    color: '#2A2520',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2A2520',
    marginBottom: 16,
    textAlign: 'center',
  },
  pickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  pickerColumn: {
    flex: 1,
    alignItems: 'center',
  },
  pickerColumnHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8A7C66',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  pickerValueRow: {
    width: '80%',
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
    marginBottom: 4,
  },
  pickerValueRowActive: {
    backgroundColor: '#FDE1C3',
  },
  pickerValueText: {
    fontSize: 15,
    color: '#2A2520',
  },
  pickerValueTextActive: {
    color: '#E58A2B',
    fontWeight: '700',
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    height: 44,
    borderWidth: 1.5,
    borderColor: '#EFE3CC',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCancelBtnText: {
    fontWeight: '700',
    color: '#8A7C66',
  },
  modalConfirmBtn: {
    flex: 1,
    height: 44,
    backgroundColor: theme.colors.charcoal,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalConfirmBtnText: {
    fontWeight: '700',
    color: '#FFFFFF',
  },
  monthHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  monthNavBtn: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAF5EA',
    borderRadius: 16,
  },
  monthNavBtnText: {
    fontSize: 14,
    color: '#E58A2B',
  },
  monthLabelText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2A2520',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'flex-start',
    marginBottom: 20,
  },
  dayGridCell: {
    width: '12%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
    backgroundColor: '#FAF5EA',
  },
  dayGridCellActive: {
    backgroundColor: '#E58A2B',
  },
  dayGridCellText: {
    fontSize: 14,
    color: '#2A2520',
  },
  dayGridCellTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  datePickerCloseBtn: {
    backgroundColor: '#FAF5EA',
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  datePickerCloseBtnText: {
    fontWeight: '700',
    color: '#8A7C66',
  },
});

export default ManageAvailabilityScreen;
