"use client";

import React, { useState, useEffect } from "react";
// import { usePrivy } from "@privy-io/react-auth";
import {  ChevronRight, X, Info, ExternalLink } from "lucide-react";
import Image from "next/image";

import Header from "./header";

interface Challenge {
  title: string;
  description: string;
  points: number;
  url: string;
  image?: string;
  "image-width"?: string;
  "image-height"?: string;
  startDate?: string;
  endDate?: string;
  // Computed/derived fields
  id?: string;
  progress?: number;
  maxProgress?: number;
  isCompleted?: boolean;
  expiresAt?: string;
  
  
  category?: string;
}

interface ChallengeModalProps {
  challenge: Challenge;
  isOpen: boolean;
  onClose: () => void;
}

const ChallengeModal: React.FC<ChallengeModalProps> = ({ challenge, isOpen }) => {
  if (!isOpen) return null;

  const getChallengeType = () => {
    if (challenge.category === 'Weekly') return 'weekly';
    if (challenge.category === 'Daily') return 'daily';
    return 'quest';
  };

  const challengeType = getChallengeType();

  return (
    <div className="flex flex-col gap-4">
      {/* First Container - Challenge Header */}
      <div className="p-6">
        {/* Row 1: Challenge Type */}
        <div className="mb-4">
          <span className="body-small text-gray-600 uppercase tracking-wide">
            {challenge.category} Challenge
          </span>
        </div>

        {/* Row 2: Challenge Image */}
        {challenge.image && (
          <div 
            className="mb-4"
            style={challengeType === 'daily' ? {
              display: 'flex',
              width: '100%',
              height: '80px',
              padding: '24px',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '16px',
              borderRadius: '16px',
              background: 'radial-gradient(220.55% 55.23% at 10.91% 29.08%, rgba(0, 0, 0, 0.00) 0%, rgba(239, 139, 159, 0.20) 100%), radial-gradient(81.69% 149.02% at 30% -26.79%, rgba(0, 0, 0, 0.00) 28.61%, rgba(3, 133, 255, 0.54) 100%), #313131'
            } : {}}
          >
            <Image
              src={challenge.image}
              alt={challenge.title}
              width={parseInt(challenge["image-width"] || "300")}
              height={parseInt(challenge["image-height"] || "200")}
              className={challengeType === 'daily' ? "h-full w-auto object-contain" : "w-full h-auto object-contain rounded-xl"}
            />
          </div>
        )}

        {/* Row 3: Challenge Title */}
        <div>
          <div className="title2 text-black">{challenge.title}</div>
        </div>
      </div>

      {/* Second Container - Challenge Details */}
      <div className="p-6">
        {/* Row 1: Details Header */}
        <div className="flex items-center gap-2 mb-4">
          <Info className="w-4 h-4 text-gray-600" />
          <span className="body-small text-gray-600 uppercase tracking-wide">Details</span>
        </div>

        {/* Row 2: Description */}
        <div className="mb-6">
          <p className="text-gray-600 font-mono">{challenge.description}</p>
        </div>

        {/* Row 3: Points and Action Button */}
        <div className="mb-6">
          {challengeType === 'weekly' ? (
            // Weekly: 3 columns - Points, Action Button, Date Range
            <div className="grid grid-cols-3 gap-4">
              {/* Points */}
              <div 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  width: '100%',
                  height: '32px',
                  backgroundColor: 'transparent',
                  borderRadius: '16px',
                  padding: '6px 12px',
                  border: '1px solid #e0e0e0'
                }}
              >
                <Image
                  src="/ep_coin.svg"
                  alt="coin"
                  width={16}
                  height={16}
                  className="w-4 h-4"
                />
                <div className="body-small text-black">{challenge.points}</div>
              </div>

              {/* Action Button */}
              <div 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  width: '100%',
                  height: '32px',
                  backgroundColor: 'transparent',
                  borderRadius: '16px',
                  padding: '6px 12px',
                  border: '1px solid #e0e0e0',
                  cursor: 'pointer'
                }}
              >
                <Image
                  src="/guidance_library.svg"
                  alt="library"
                  width={16}
                  height={16}
                  className="w-4 h-4"
                />
                <div className="body-small text-black">Buy</div>
              </div>

              {/* Date Range */}
              <div 
                style={{
                  display: 'flex',
                  height: '28px',
                  padding: '4px 16px 4px 12px',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flex: '1 0 0',
                  borderRadius: '1000px',
                  border: '1px solid #EDEDED'
                }}
              >
                <div className="text-xs font-mono text-gray-600 text-center">
                  {challenge.startDate && challenge.endDate ? (
                    <div className="flex items-center gap-1">
                      <span>{new Date(challenge.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      <span>-</span>
                      <span>{new Date(challenge.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    </div>
                  ) : (
                    challenge.expiresAt
                  )}
                </div>
              </div>
            </div>
          ) : challengeType === 'daily' ? (
            // Daily: 2 columns - Points, Action Button
            <div className="grid grid-cols-2 gap-4">
              {/* Points */}
              <div 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  width: '100%',
                  height: '32px',
                  backgroundColor: 'transparent',
                  borderRadius: '16px',
                  padding: '6px 12px',
                  border: '1px solid #e0e0e0'
                }}
              >
                <Image
                  src="/ep_coin.svg"
                  alt="coin"
                  width={16}
                  height={16}
                  className="w-4 h-4"
                />
                <div className="body-small text-black">{challenge.points}</div>
              </div>

              {/* Action Button */}
              <div 
                style={{
                  display: 'flex',
                  alignItems: 'left',
                  justifyContent: 'left',
                  gap: '8px',
                  width: '100%',
                  height: '32px',
                  backgroundColor: 'transparent',
                  borderRadius: '16px',
                  padding: '6px 12px',
                  border: '1px solid #e0e0e0',
                  cursor: 'pointer'
                }}
              >
                <Image
                  src="/guidance_library.svg"
                  alt="library"
                  width={16}
                  height={16}
                  className="w-4 h-4"
                />
                <div className="body-small text-black">Buy</div>
              </div>
            </div>
          ) : (
            // Quest: 2 columns - Points, Action Button (same as daily)
            <div className="grid grid-cols-2 gap-4">
              {/* Points */}
              <div 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  width: '100%',
                  height: '32px',
                  backgroundColor: 'transparent',
                  borderRadius: '16px',
                  padding: '6px 12px',
                  border: '1px solid #e0e0e0'
                }}
              >
                <Image
                  src="/ep_coin.svg"
                  alt="coin"
                  width={16}
                  height={16}
                  className="w-4 h-4"
                />
                <div className="body-small text-black">{challenge.points}</div>
              </div>

              {/* Action Button */}
              <div 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  width: '100%',
                  height: '32px',
                  backgroundColor: 'transparent',
                  borderRadius: '16px',
                  padding: '6px 12px',
                  border: '1px solid #e0e0e0',
                  cursor: 'pointer'
                }}
              >
                <Image
                  src="/guidance-library.svg"
                  alt="library"
                  width={16}
                  height={16}
                  className="w-4 h-4"
                />
                <div className="body-small text-black">Buy</div>
              </div>
            </div>
          )}
        </div>

        {/* Row 4: Complete Challenge Button */}
        <button
          className="w-full bg-black hover:bg-gray-800 text-white py-3 px-4 rounded-full font-inktrap font-medium transition-colors duration-200 flex items-center justify-center gap-2"
        >
          Complete Challenge on Galaxe
          <ExternalLink className="w-4 h-4" />
        </button>
      </div>

      {/* Daily Challenge Streak Section - Only for Daily Challenges */}
      {challengeType === 'daily' && (
        <div className="p-6">
          {/* Row 1: Streak Header */}
          <div className="flex items-center gap-2 mb-4">
            <Info className="w-4 h-4 text-gray-600" />
            <span className="body-small text-gray-600 uppercase tracking-wide">DAILY CHALLENGE STREAK</span>
          </div>

          {/* Row 2: Streak Image */}
          <div className="mb-4">
            <Image
              src="/challenges/points-streak-modal.svg"
              alt="points streak"
              width={400}
              height={100}
              className="w-full h-auto"
            />
          </div>

          {/* Row 3: Streak Description */}
          <div className="body-medium text-gray-600">
            Every day you complete a Daily Challenge, your earned points double - resets on Monday every week.
            Miss one day and your streak goes back to 50.
          </div>
        </div>
      )}
    </div>
  );
};

export default function ChallengesPage() {
 // const { user } = usePrivy();
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [weeklyChallenges, setWeeklyChallenges] = useState<Challenge[]>([]);
  const [dailyChallenges, setDailyChallenges] = useState<Challenge[]>([]);
  const [challengeQuests, setChallengeQuests] = useState<Challenge[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Helper function to enrich challenge data
  const enrichChallenge = (challenge: any, type: string): Challenge => {
    const enriched = {
      ...challenge,
      id: `${type}-${challenge.title.toLowerCase().replace(/\s+/g, '-')}`,
      progress: Math.floor(Math.random() * 5) + 1, // Mock progress
      maxProgress: type === 'quest' ? 15 : 10,
      isCompleted: Math.random() > 0.7, // Mock completion status
      
      
      category: type.charAt(0).toUpperCase() + type.slice(1)
    };

    // Add expiration logic for weekly challenges
    if (type === 'weekly' && challenge.startDate && challenge.endDate) {
      
      const endDate = new Date(challenge.endDate);
      const now = new Date();
      const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysLeft > 0) {
        enriched.expiresAt = `Ends in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`;
      } else {
        enriched.expiresAt = 'Ended';
        enriched.isCompleted = true;
      }
    } else if (type === 'daily') {
      enriched.expiresAt = 'Resets in 12 hours';
    }

    return enriched;
  };

  // Load challenge data from JSON files
  useEffect(() => {
    const loadChallenges = async () => {
      try {
        setIsLoading(true);
        console.log('Loading challenges...');

        // Load weekly challenge
        console.log('Fetching weekly challenges...');
        const weeklyResponse = await fetch('/data/challenges/weekly.json');
        console.log('Weekly response status:', weeklyResponse.status);
        if (weeklyResponse.ok) {
          const weeklyData = await weeklyResponse.json();
          console.log('Weekly data:', weeklyData);
          setWeeklyChallenges([enrichChallenge(weeklyData, 'weekly')]);
        } else {
          console.error('Failed to load weekly challenges:', weeklyResponse.status);
        }

        // Load daily challenge
        console.log('Fetching daily challenges...');
        const dailyResponse = await fetch('/data/challenges/daily.json');
        console.log('Daily response status:', dailyResponse.status);
        if (dailyResponse.ok) {
          const dailyData = await dailyResponse.json();
          console.log('Daily data:', dailyData);
          setDailyChallenges([enrichChallenge(dailyData, 'daily')]);
        } else {
          console.error('Failed to load daily challenges:', dailyResponse.status);
        }

        // Load quest challenges
        console.log('Fetching quest challenges...');
        const questsResponse = await fetch('/data/challenges/quests.json');
        console.log('Quests response status:', questsResponse.status);
        if (questsResponse.ok) {
          const questsData = await questsResponse.json();
          console.log('Quests data:', questsData);
          const enrichedQuests = questsData.map((quest: any) => enrichChallenge(quest, 'quest'));
          setChallengeQuests(enrichedQuests);
        } else {
          console.error('Failed to load quest challenges:', questsResponse.status);
        }
      } catch (error) {
        console.error('Error loading challenges:', error);
      } finally {
        setIsLoading(false);
        console.log('Finished loading challenges');
      }
    };

    loadChallenges();
  }, []);

  const handleChallengeClick = (challenge: Challenge) => {
    setSelectedChallenge(challenge);
    setIsModalOpen(true);
  };



  const renderChallengeCard = (challenge: Challenge, challengeType: 'weekly' | 'daily' | 'quest' = 'quest') => {
    // Weekly challenge layout: image above title, spanning full width
    if (challengeType === 'weekly') {
      return (
        <div
          key={challenge.id}
          className="rounded-2xl flex flex-col gap-3 transition-all duration-200"
        >
          {/* Weekly Challenge Image - Full Width Above Title */}
          <div className="w-full">
            <Image
              src={challenge.image!}
              alt={challenge.title}
              width={parseInt(challenge["image-width"]!)}
              height={parseInt(challenge["image-height"]!)}
              className="w-full h-auto object-contain rounded-xl"
            />
          </div>

          {/* Title and Description */}
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <div className="title2 text-black ">
                {challenge.title}
              </div>
            </div>
            <p className="text-xs text-gray-600 font-mono line-clamp-1">
              {challenge.description}
            </p>
          </div>

          {/* Points and Learn More Button */}
          <div className="grid grid-cols-2 gap-4">
            {/* Row 2, Column 1: Points */}
            <div 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                width: '100%',
                height: '32px',
                backgroundColor: 'transparent',
                borderRadius: '16px',
                padding: '6px 12px',
                border: '1px solid #e0e0e0'
              }}
            >
              <Image
                src="/ep_coin.svg"
                alt="coin"
                width={16}
                height={16}
                className="w-4 h-4"
              />
              <div className="body-small text-black">{challenge.points}</div>
            </div>

            {/* Row 2, Column 2: Learn More Button */}
            <div className="w-full">
              <button
                onClick={() => handleChallengeClick(challenge)}
                className="w-full bg-white hover:bg-gray-100 text-black text-xs font-mono px-3 py-1.5 rounded-full transition-colors duration-200 flex items-center justify-center gap-1"
              >
                Learn More
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Daily challenge layout: 2x2 grid
    if (challengeType === 'daily') {
      return (
        <div
          key={challenge.id}
          className="rounded-2xl grid grid-cols-2 gap-4 transition-all duration-200"
        >
          {/* Row 1, Column 1: Title and Description */}
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <div className="title2 text-[#313131] ">
                {challenge.title}
              </div>
            </div>
            <div className=" text-[#4F4F4F] body-medium ">
              {challenge.description}
            </div>
          </div>

          {/* Row 1, Column 2: Daily Challenge Image */}
          <div className="flex justify-end">
            <div 
              style={{
                display: 'flex',
                padding: '24px',
                alignItems: 'flex-start',
                gap: '16px',
                borderRadius: '16px',
                background: 'radial-gradient(220.55% 55.23% at 10.91% 29.08%, rgba(0, 0, 0, 0.00) 0%, rgba(239, 139, 159, 0.20) 100%), radial-gradient(81.69% 149.02% at 30% -26.79%, rgba(0, 0, 0, 0.00) 28.61%, rgba(3, 133, 255, 0.54) 100%), #313131',
                width: '80px',
                height: '80px',
                justifyContent: 'flex-end'
              }}
            >
              <Image
                src={challenge.image!}
                alt={challenge.title}
                width={parseInt(challenge["image-width"]!)}
                height={parseInt(challenge["image-height"]!)}
                className="w-full h-full object-contain rounded-xl"
              />
            </div>
          </div>

          {/* Row 2, Column 1: Points Streak */}
          <div>
            <Image
              src="/challenges/points-streak.svg"
              alt="points streak"
              width={100}
              height={32}
              className="w-auto h-auto"
            />
          </div>

          {/* Row 2, Column 2: Learn More Button */}
          <div className="w-full">
            <button
              onClick={() => handleChallengeClick(challenge)}
              className="w-full bg-white hover:bg-gray-100 text-black text-xs font-mono px-3 py-1.5 rounded-full transition-colors duration-200 flex items-center justify-center gap-1"
            >
              Learn More
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      );
    }

    // Quest challenge layout: no image, simple layout
    return (
      <div
        key={challenge.id}
        className="rounded-2xl flex flex-col gap-3 transition-all duration-200"
      >
        {/* Title and Description */}
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <div className="title2 text-black ">
              {challenge.title}
            </div>
          </div>
          <p className="text-xs text-gray-600 font-mono line-clamp-1">
            {challenge.description}
          </p>
        </div>

        {/* Points and Learn More Button */}
        <div className="flex items-center justify-between">
          <div 
            style={{
              display: 'flex',
              padding: '4px 8px',
              alignItems: 'center',
              gap: '8px',
              flex: '0 0 0',
              alignSelf: 'stretch'
            }}
          >
            <span className="text-xs font-mono text-black">{challenge.points} pts</span>
          </div>
          
          <button
            onClick={() => handleChallengeClick(challenge)}
            className="bg-black hover:bg-gray-800 text-white text-xs font-mono px-3 py-1.5 rounded-full transition-colors duration-200"
          >
            Learn More
          </button>
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
          {/* Loading State */}
          {isLoading && (
            <div className="bg-white rounded-2xl p-8 text-center">
              <div className="w-8 h-8 border-2 border-gray-300 border-t-black rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600 font-inktrap">Loading challenges...</p>
            </div>
          )}
          {/* Weekly Challenges Section */}
          {!isLoading && (
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
              <div className="flex items-center gap-2 mb-4">
                
                <span className="body-small text-gray-600 uppercase tracking-wide">
                  Weekly Challenges
                </span>
              </div>
              <div className="space-y-3">
                {weeklyChallenges.map(challenge => renderChallengeCard(challenge, 'weekly'))}
              </div>
            </div>
          )}

          {/* Daily Challenges Section */}
          {!isLoading && (
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
              <div className="flex items-center gap-2 mb-4">
                
                <span className="body-small text-gray-600 uppercase tracking-wide">
                  Daily Challenges
                </span>
              </div>
              <div className="space-y-3">
                {dailyChallenges.map(challenge => renderChallengeCard(challenge, 'daily'))}
              </div>
            </div>
          )}

          {/* Challenge Quests Section */}
          {!isLoading && (
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
              <div className="flex items-center gap-2 mb-4">
                
                <span className="body-small text-gray-600 uppercase tracking-wide ">
                  Challenge Quests
                </span>
              </div>
              <div className="space-y-3">
                {challengeQuests.map(challenge => renderChallengeCard(challenge, 'quest'))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Challenge Modal */}
      {isModalOpen && selectedChallenge && (
        <div
          className={`fixed font-inktrap inset-0 bg-[#ededed] z-50 flex flex-col transition-all duration-300 ease-in-out ${
            isModalOpen ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="max-w-lg mx-auto w-full flex flex-col h-full">
            {/* Close Button - Full Width Overlay */}
            <div className="w-full px-4 pt-4 pb-1">
              <div className="bg-white rounded-3xl">
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    setSelectedChallenge(null);
                  }}
                  className="w-full text-black h-10 rounded-full hover:bg-gray-100 transition-colors flex items-center justify-center"
                  aria-label="Close menu"
                >
                  <X size={24} />
                </button>
              </div>
            </div>
            
            <div className="w-full px-4 pb-4">
              <div className="bg-white rounded-3xl">
                <ChallengeModal 
                  challenge={selectedChallenge} 
                  isOpen={isModalOpen} 
                  onClose={() => {
                    setIsModalOpen(false);
                    setSelectedChallenge(null);
                  }} 
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
