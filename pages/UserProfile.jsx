import React from 'react';
import { useParams } from 'react-router-dom';
import TwitterEmbed from '../components/TwitterEmbed';
import './UserProfile.css';

const UserProfile = () => {
  const { username } = useParams();

  return (
    <div className="user-profile-page">
      <div className="profile-header">
        <h1>{username ? `${username} 的推特主页` : 'Twitter用户资料'}</h1>
      </div>
      
      <div className="profile-content">
        <TwitterEmbed />
      </div>
    </div>
  );
};

export default UserProfile; 