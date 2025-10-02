"use client";

import React, { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { Trophy, Calendar, Target, Star, ChevronRight, Clock, Users, Award } from "lucide-react";
import Image from "next/image";
import Header from "./header";
import Link from "next/link";

interface Challenge {
  id: string;
  title: string;
  description: string;
  points: number;
  progress: number;
  maxProgress: number;
  isCompleted: boolean;
  expiresAt?: string;
  participants?: number;
  difficulty: 'easy' | 'medium' | 'hard';
  category: string;
}

interface ChallengeModalProps {
  challenge: Challenge;
  isOpen: boolean;
  onClose: () => void;
}

const ChallengeModal: React.FC<ChallengeModalProps> = ({ challenge, isOpen, onClose }) => {
  if (!isOpen) return null;

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'hard': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const progressPercentage = (challenge.progress / challenge.maxProgress) * 100;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <Trophy className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-inktrap font-bold text-black">{challenge.title}</h2>
                <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(challenge.difficulty)}`}>
                  {challenge.difficulty.toUpperCase()}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Description */}
          <p className="text-gray-600 font-mono mb-6">{challenge.description}</p>

          {/* Progress */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-inktrap text-gray-700">Progress</span>
              <span className="text-sm font-mono text-gray-600">
                {challenge.progress}/{challenge.maxProgress}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Star className="w-4 h-4 text-yellow-500" />
                <span className="text-sm font-inktrap text-gray-700">Reward</span>
              </div>
              <span className="text-lg font-bold text-black">{challenge.points} pts</span>
            </div>
            {challenge.participants && (
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-inktrap text-gray-700">Participants</span>
                </div>
                <span className="text-lg font-bold text-black">{challenge.participants}</span>
              </div>
            )}
          </div>

          {/* Expiration */}
          {challenge.expiresAt && (
            <div className="bg-orange-50 rounded-lg p-3 mb-6">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-orange-500" />
                <span className="text-sm font-inktrap text-orange-700">Expires</span>
              </div>
              <span className="text-sm font-mono text-orange-800">{challenge.expiresAt}</span>
            </div>
          )}

          {/* Action Button */}
          <button
            className={`w-full py-3 px-4 rounded-full font-inktrap font-medium transition-colors ${
              challenge.isCompleted
                ? 'bg-green-100 text-green-800 cursor-not-allowed'
                : 'bg-black text-white hover:bg-gray-800'
            }`}
            disabled={challenge.isCompleted}
          >
            {challenge.isCompleted ? (
              <div className="flex items-center justify-center gap-2">
                <Award className="w-4 h-4" />
                Completed
              </div>
            ) : (
              'Start Challenge'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default function ChallengesPage() {
  const { user } = usePrivy();
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Mock data - replace with actual API calls
  const weeklyChallenges: Challenge[] = [
    {
      id: 'weekly-1',
      title: 'Social Butterfly',
      description: 'Check into 10 different locations this week and share your experiences on social media.',
      points: 500,
      progress: 7,
      maxProgress: 10,
      isCompleted: false,
      expiresAt: 'Ends in 3 days',
      participants: 1247,
      difficulty: 'medium',
      category: 'Social'
    }
  ];

  const dailyChallenges: Challenge[] = [
    {
      id: 'daily-1',
      title: 'Morning Coffee Run',
      description: 'Check into a coffee shop before 10 AM and share your favorite drink.',
      points: 100,
      progress: 1,
      maxProgress: 1,
      isCompleted: true,
      expiresAt: 'Resets in 12 hours',
      participants: 3421,
      difficulty: 'easy',
      category: 'Daily'
    }
  ];

  const challengeQuests: Challenge[] = [
    {
      id: 'quest-1',
      title: 'City Explorer Master',
      description: 'Complete all major landmarks in your city to unlock exclusive rewards.',
      points: 1000,
      progress: 8,
      maxProgress: 15,
      isCompleted: false,
      participants: 234,
      difficulty: 'hard',
      category: 'Achievement'
    },
    {
      id: 'quest-2',
      title: 'Foodie Adventure',
      description: 'Try 20 different restaurants and rate your experience.',
      points: 750,
      progress: 12,
      maxProgress: 20,
      isCompleted: false,
      participants: 567,
      difficulty: 'medium',
      category: 'Food'
    }
  ];

  const handleChallengeClick = (challenge: Challenge) => {
    setSelectedChallenge(challenge);
    setIsModalOpen(true);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'hard': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const renderChallengeCard = (challenge: Challenge, isClickable: boolean = true) => {
    const progressPercentage = (challenge.progress / challenge.maxProgress) * 100;

    return (
      <div
        key={challenge.id}
        className={`rounded-2xl p-4 grid grid-cols-[auto_1fr_auto] gap-4 items-center transition-all duration-200 ${
          isClickable 
            ? 'cursor-pointer hover:bg-gray-50' 
            : 'cursor-default'
        } ${challenge.isCompleted ? 'bg-green-50' : 'bg-white'}`}
        onClick={isClickable ? () => handleChallengeClick(challenge) : undefined}
      >
        {/* Icon */}
        <div className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
            challenge.isCompleted 
              ? 'bg-green-500' 
              : 'bg-gradient-to-br from-purple-500 to-pink-500'
          }`}>
            {challenge.isCompleted ? (
              <Award className="w-3 h-3 text-white" />
            ) : (
              <Trophy className="w-3 h-3 text-white" />
            )}
          </div>
        </div>

        {/* Title and Description */}
        <div className="min-w-0 pl-2">
          <div className="flex items-center gap-2 mb-1">
            <span className="title4 text-black font-inktrap truncate">
              {challenge.title}
            </span>
            <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${getDifficultyColor(challenge.difficulty)}`}>
              {challenge.difficulty.toUpperCase()}
            </span>
          </div>
          <p className="text-xs text-gray-600 font-mono line-clamp-1">
            {challenge.description}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <Star className="w-3 h-3 text-yellow-500" />
            <span className="text-xs font-mono text-black">{challenge.points} pts</span>
            {challenge.participants && (
              <>
                <span className="text-xs text-gray-400">•</span>
                <Users className="w-3 h-3 text-blue-500" />
                <span className="text-xs font-mono text-gray-600">{challenge.participants}</span>
              </>
            )}
          </div>
        </div>

        {/* Progress and Action */}
        <div className="text-right">
          {isClickable && (
            <ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />
          )}
          <div className="text-xs font-mono text-gray-600 mt-1">
            {challenge.progress}/{challenge.maxProgress}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      style={{
        background:
          "linear-gradient(0deg, #61BFD1 0%, #EE91B7 26.92%, #FFE600 54.33%, #1BA351 100%)",
      }}
      className="min-h-screen p-4 pb-0 font-grotesk"
    >
      <div className="max-w-lg mx-auto">
        {/* Status Bar */}
        <Header />

        {/* Main Content */}
        <div className="px-0 pt-4 space-y-4">
          {/* Weekly Challenges Section */}
          <div className="bg-white rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-4 h-4 text-purple-600" />
              <span className="body-small text-gray-600 uppercase tracking-wide font-inktrap">
                Weekly Challenges
              </span>
            </div>
            <div className="space-y-3">
              {weeklyChallenges.map(challenge => renderChallengeCard(challenge))}
            </div>
          </div>

          {/* Daily Challenges Section */}
          <div className="bg-white rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-4 h-4 text-blue-600" />
              <span className="body-small text-gray-600 uppercase tracking-wide font-inktrap">
                Daily Challenges
              </span>
            </div>
            <div className="space-y-3">
              {dailyChallenges.map(challenge => renderChallengeCard(challenge))}
            </div>
          </div>

          {/* Challenge Quests Section */}
          <div className="bg-white rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <Award className="w-4 h-4 text-green-600" />
              <span className="body-small text-gray-600 uppercase tracking-wide font-inktrap">
                Challenge Quests
              </span>
            </div>
            <div className="space-y-3">
              {challengeQuests.map(challenge => renderChallengeCard(challenge, false))}
            </div>
          </div>
        </div>
      </div>

      {/* Challenge Modal */}
      {selectedChallenge && (
        <ChallengeModal
          challenge={selectedChallenge}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
}
