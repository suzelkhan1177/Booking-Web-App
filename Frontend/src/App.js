import React, { useEffect, useState } from 'react';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:8001';

function generateSlots() {
  const slots = [];
  let hour = 9;
  let minute = 0;
  for (let i = 0; i < 18; i++) { 
    const hh = String(hour).padStart(2, '0');
    const mm = String(minute).padStart(2, '0');
    slots.push(`${hh}:${mm}`);
    minute += 30;
    if (minute === 60) {
      minute = 0;
      hour += 1;
    }
  }
  return slots;
}

export default function App() {
  const [date, setDate] = useState('');
  const [available, setAvailable] = useState([]);
  const [booked, setBooked] = useState([]); 
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (date) fetchSlots(date);
  }, [date]);

  async function fetchSlots(dateStr) {
    try {
      const res = await axios.get(`${API_BASE}/api/v1/slots/${dateStr}`);
      setAvailable(res.data.available || []);
      setBooked(res.data.booked || []); 
      setMessage('');
    } catch (err) {
      console.error(err);
      setMessage('Error fetching slots');
    }
  }

  async function bookSlot(time) {
    try {
      const name = prompt('Enter your Name (required)');
      if (!name) return alert("Name is required");

      const res = await axios.post(`${API_BASE}/api/v1/book`, { date, time,  name });

      if (res.status === 201) {
        setMessage(`✅ Booked ${time} on ${date} for ${name}`);
        fetchSlots(date); 
      }
    } catch (err) {
      console.error(err);
      if (err.response && err.response.status === 409) {
        setMessage('❌ Slot already booked.');
      } else {
        setMessage('Booking failed.');
      }
    }
  }

  const allSlots = generateSlots();

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: 20, maxWidth: 800, margin: '0 auto' }}>
      <h1 style={{ textAlign: 'center', color: '#333' }}>30-Minute Slot Booking</h1>
      <p style={{ textAlign: 'center' }}>Select a date and choose an available slot between 09:00 and 17:30.</p>

      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <label>
          Pick a date:{' '}
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
      </div>

      {date ? (
        <>
          <h3 style={{ textAlign: 'center', marginBottom: 10 }}>Available slots for {date}</h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 12
          }}>
            {allSlots.map(slot => {
              const bookedSlot = booked.find(b => b.time === slot); 
              const isBooked = !!bookedSlot;
              const isAvailable = available.includes(slot);

              return (
                <button
                  key={slot}
                  disabled={isBooked}
                  onClick={() => isAvailable && bookSlot(slot)}
                  style={{
                    padding: '12px',
                    borderRadius: 8,
                    border: 'none',
                    fontWeight: 'bold',
                    background: isBooked ? '#ccc' : '#007bff',
                    color: isBooked ? '#333' : '#fff',
                    cursor: isBooked ? 'not-allowed' : 'pointer',
                    transition: 'all 0.3s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (isAvailable) e.target.style.background = '#0056b3';
                  }}
                  onMouseLeave={(e) => {
                    if (isAvailable) e.target.style.background = '#007bff';
                  }}
                >
                  {slot} {isBooked ? ` (Booked by ${bookedSlot.name})` : ''}
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <p style={{ textAlign: 'center' }}>Please pick a date to see available slots.</p>
      )}

      {message && (
        <div style={{
          marginTop: 20,
          padding: 12,
          background: '#e6ffe6',
          border: '1px solid #b2ffb2',
          borderRadius: 6,
          textAlign: 'center'
        }}>
          {message}
        </div>
      )}
    </div>
  );
}
