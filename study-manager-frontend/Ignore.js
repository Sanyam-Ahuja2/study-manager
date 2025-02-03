import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ReactPlayer from 'react-player';
import './App.css';

function App() {
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [lectures, setLectures] = useState([]);
  const [selectedLecture, setSelectedLecture] = useState(null);
  const [chapterProgress, setChapterProgress] = useState({ watchedProgress: 0, remainingProgress: 0 });
  const [subjectProgress, setSubjectProgress] = useState({ watchedProgress: 0, remainingProgress: 0 });
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [playbackSpeed, setPlaybackSpeed] = useState(2); // State for playback speed

  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    setIsDarkMode(savedDarkMode);
  }, []);

  useEffect(() => {
    document.body.classList.toggle('dark-mode', isDarkMode);
    localStorage.setItem('darkMode', isDarkMode);
  }, [isDarkMode]);

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    if (savedToken) {
      setToken(savedToken);
      setIsLoggedIn(true);
      fetchSubjects(savedToken);
    }
  }, []);

  const fetchSubjects = (authToken) => {
    axios.get('http://localhost:5000/api/subjects', {
      headers: { 'Authorization': authToken }
    })
      .then(response => setSubjects(response.data))
      .catch(error => console.error(error));
  };

  const fetchChapterDuration = (chapterId, authToken) => {
    return axios.get(`http://localhost:5000/api/chapters/${chapterId}/duration`, {
      headers: { 'Authorization': authToken }
    })
      .then(response => {
        const { watched_duration, total_duration } = response.data;
        const watchedProgress = Math.round(((watched_duration / 60) / 60) * 100) / 100;
        const remainingProgress = Math.round(((total_duration - watched_duration) / 3600) * 100) / 100;
        setChapterProgress({ watchedProgress, remainingProgress });
        return { watchedProgress, remainingProgress };
      })
      .catch(error => {
        console.error(error);
        return { watchedProgress: 0, remainingProgress: 0 };
      });
  };

  const fetchChapters = (subjectId, authToken) => {
    axios.get(`http://localhost:5000/api/subjects/${subjectId}/chapters`, {
      headers: { 'Authorization': authToken }
    })
      .then(response => {
        const chaptersData = response.data;

        const fetchRemainingTimes = chaptersData.map(chapter => fetchChapterDuration(chapter.id, authToken));

        Promise.all(fetchRemainingTimes)
          .then(chapterProgressData => {
            const updatedChapters = chaptersData.map((chapter, index) => ({
              ...chapter,
              completed: chapterProgressData[index].remainingProgress === 0
            }));
            setChapters(updatedChapters);
          });

        setSelectedSubject(subjectId);
        setSelectedChapter(null);
        setLectures([]);
        fetchSubjectDuration(subjectId, authToken);
      })
      .catch(error => console.error(error));
  };

  const fetchLectures = (chapterId, authToken) => {
    axios.get(`http://localhost:5000/api/chapters/${chapterId}/lectures`, {
      headers: { 'Authorization': authToken }
    })
      .then(response => {
        setLectures(response.data);
        setSelectedChapter(chapterId);
        fetchChapterDuration(chapterId, authToken);
      })
      .catch(error => console.error(error));
  };

  const fetchSubjectDuration = (subjectId, authToken) => {
    axios.get(`http://localhost:5000/api/subjects/${subjectId}/duration`, {
      headers: { 'Authorization': authToken }
    })
      .then(response => {
        const { watched_duration, total_duration } = response.data;
        const watchedProgress = Math.round(((watched_duration / 60) / 60) * 100) / 100;
        const remainingProgress = Math.round(((total_duration - watched_duration) / 3600) * 100) / 100;
        setSubjectProgress({ watchedProgress, remainingProgress });
      })
      .catch(error => console.error(error));
  };

  const toggleWatchedStatus = (lectureId, authToken) => {
    return axios.put(`http://localhost:5000/api/lectures/${lectureId}/toggle-watched`, {}, {
      headers: { 'Authorization': authToken }
    })
      .then(response => {
        setLectures(lectures.map(lecture =>
          lecture.id === lectureId ? { ...lecture, watched: response.data.watched } : lecture
        ));
        return response.data.watched;
      })
      .catch(error => {
        console.error(error);
        return null;
      });
  };

  const handleLectureClick = (lecture) => {
    setSelectedLecture(lecture);
  };

  const handleEnded = async () => {
    if (selectedLecture) {
      const watchedStatus = await toggleWatchedStatus(selectedLecture.id, token);

      if (watchedStatus !== null) {
        const currentIndex = lectures.findIndex(lecture => lecture.id === selectedLecture.id);
        if (currentIndex !== -1 && currentIndex < lectures.length - 1) {
          const nextLecture = lectures[currentIndex + 1];
          setSelectedLecture(nextLecture);
        } else {
          setSelectedLecture(null); // No more lectures
        }
      }
    }
  };

  const handleError = (error) => {
    console.error("Error playing video:", error);
    alert("An error occurred while playing the video. Please try again later.");
  };

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  const handleRegister = () => {
    axios.post('http://localhost:5000/api/register', { username, password })
      .then(response => {
        alert('Registration successful');
      })
      .catch(error => {
        console.error(error);
        alert('Registration failed');
      });
  };

  const handleLogin = () => {
    axios.post('http://localhost:5000/api/login', { username, password })
      .then(response => {
        setToken(response.data.token);
        localStorage.setItem('token', response.data.token);
        setIsLoggedIn(true);
        fetchSubjects(response.data.token);
      })
      .catch(error => {
        console.error(error);
        alert('Login failed');
      });
  };

  const handleLogout = () => {
    setToken('');
    setIsLoggedIn(false);
    localStorage.removeItem('token');
  };

  return (
    <div className="app-container">
      <button className="dark-mode-toggle" onClick={toggleDarkMode}>
        {isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      </button>
      <h1 className="title">Study Manager</h1>

      {!isLoggedIn ? (
        <div className="auth-container">
          <div className="login-container">
            <h2>Login</h2>
            <input
              type="text"
              className="input-field"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <input
              type="password"
              className="input-field"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button className="auth-button" onClick={handleLogin}>Login</button>
          </div>
          <div className="register-container">
            <h2>Register</h2>
            <input
              type="text"
              className="input-field"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <input
              type="password"
              className="input-field"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button className="auth-button" onClick={handleRegister}>Register</button>
          </div>
        </div>
      ) : (
        <div>
          <button  className="auth-button2" onClick={handleLogout}>Logout</button>
          <div className="subjects-container">
            {subjects.map(subject => (
              <div key={subject.id} className="subject-item">
                <button onClick={() => fetchChapters(subject.id, token)} className="subject-button">
                  {subject.name}
                </button>
              </div>
            ))}
          </div>
          {selectedSubject && (
            <>
              <h2 className="section-title">Chapters</h2>
              <ul className="chapters-list">
                {chapters.map(chapter => (
                  <li key={chapter.id} className={`chapter-item ${chapter.completed ? 'completed' : ''}`} onClick={() => fetchLectures(chapter.id, token)}>
                    <span>{chapter.name}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
          {selectedChapter && (
            <div className="content-container">
              {selectedLecture && (
                <div className="video-player-container">
                  <h2>{selectedLecture.name}</h2>
                  <ReactPlayer
                    url={`http://192.168.100.84:5000${selectedLecture.file_path}`}
                    controls={true}
                    width="100%"
                    height="100%"
                    playbackRate={playbackSpeed}
                    onEnded={handleEnded}
                    onError={handleError}
                  />
                  <div className="speed-controls">
                    <label>Playback Speed:</label>
                    <button onClick={() => setPlaybackSpeed(1)}>1x</button>
                    <button onClick={() => setPlaybackSpeed(1.5)}>1.5x</button>
                    <button onClick={() => setPlaybackSpeed(2)}>2x</button>
                    <button onClick={() => setPlaybackSpeed(2.05)}>2.05x</button>
                    <button onClick={() => setPlaybackSpeed(2.15)}>2.15x</button>
                    <button onClick={() => setPlaybackSpeed(2.20)}>2.20x</button>
                    <button onClick={() => setPlaybackSpeed(2.25)}>2.25x</button>
                    <button onClick={() => setPlaybackSpeed(2.5)}>2.5x</button>
                    <button onClick={() => setPlaybackSpeed(2.75)}>2.75x</button>
                    <button onClick={() => setPlaybackSpeed(3)}>3x</button>
                    <button onClick={() => setPlaybackSpeed(3.1)}>3.1x</button>
                    <button onClick={() => setPlaybackSpeed(3.2)}>3.2x</button>
                    <button onClick={() => setPlaybackSpeed(3.3)}>3.3x</button>
                    <button onClick={() => setPlaybackSpeed(3.4)}>3.4x</button>
                    <button onClick={() => setPlaybackSpeed(3.5)}>3.5x</button>
                  </div>
                </div>
              )}
              <div className="lectures-container">
                <h2 className="section-title">Lectures</h2>
                <ul className="lectures-list">
                  {lectures.map(lecture => (
                    <li key={lecture.id} className={lecture.watched ? "lecture-item watched" : "lecture-item"} onClick={() => handleLectureClick(lecture)}>
                      {lecture.name} - {lecture.watched ? 'Watched' : 'Unwatched'}
                      <button onClick={() => toggleWatchedStatus(lecture.id, token)} className="watched-button">
                        Mark as {lecture.watched ? 'Unwatched' : 'Watched'}
                      </button>
                    </li>
                  ))}
                </ul>
                <h2>Chapter Progress</h2>
                <div>
                  Watched Progress: {chapterProgress.watchedProgress}
                </div>
                <div>
                  Remaining Progress: {chapterProgress.remainingProgress}
                </div>
              </div>
            </div>
          )}
          {selectedSubject && !selectedChapter && (
            <div className="progress-container">
              <h2 className="section-title">Subject Progress</h2>
              <div className="progress-bar">
                <div className="watched-progress">
                  Watched: {subjectProgress.watchedProgress}
                </div>
                <div className="remaining-progress">
                  Remaining: {subjectProgress.remainingProgress}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
