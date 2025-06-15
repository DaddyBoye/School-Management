const TeacherDashboard = () => {
    const profileData = JSON.parse(localStorage.getItem('profileData') || '{}');

  return (
    <div>
      <h1>Teacher Dashboard</h1>
      {profileData.first_name}
    </div>
  );
};

export default TeacherDashboard;