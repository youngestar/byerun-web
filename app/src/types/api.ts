export interface OauthToken {
  token: string;
  refreshToken: string;
}

export interface UserInfo {
  userId: number;
  studentId: number;
  registerCode: string;
  studentName: string;
  gender: string;
  schoolId: number;
  schoolName: string;
  classId: number;
  studentClass: number;
  className: string;
  startSchool: number;
  collegeCode: string;
  collegeName: string;
  majorCode: string;
  majorName: string;
  nationCode: string;
  birthday: string;
  idCardNo: string;
  addrDetail: string;
  studentSource: string;
  userVerifyStatus: string;
}

export interface LoginResponse {
  code: number;
  msg: string;
  response: UserInfo & {
    oauthToken: OauthToken;
  };
}

export interface ApiResponse<T> {
  code: number;
  msg: string;
  response: T;
}

export interface Notice {
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
}

export interface SportsClassClocking {
  classLearnId: number;
  clockingRange: string;
  startTime: string;
  endTime: string;
  latitude: string;
  longitude: string;
  planLearn: string;
  signBackStatus: string;
  signInStatus: string;
  signStatus: string;
  sportsClassId: string;
  sportsClassName: string;
}

export interface SignInTf {
  activityId: number;
  activityName: string;
  activityType: string;
  address: string;
  continueTime: number;
  startTime: string;
  endTime: string;
  longitude: string;
  latitude: string;
  signBackLimitTime: number;
  signBackStatus: string; // "1": 已签退
  signInStatus: string; // "1": 已签到
  signInTime: string;
  signStatus: string; // "1": 待签到, "2": 待签退
}

export interface ClubInfo {
  clubActivityId: number;
  activityName: string;
  addressDetail: string;
  clubIntroduction: string;
  signInStudent: number;
  maxStudent: number;
  teacherName: string;
  startTime: string;
  endTime: string;
  optionStatus: string;
  fullActivity: string;
  cancelSign: number;
  yearSemester: number;
  activityItemId: number;
  signStatus: number;
}

export interface JoinClubResult {
  status?: string;
  message?: string;
  failDesc?: string;
  resultMsg?: string;
  resultStatus?: string;
}

export interface SignInOrSignBackBody {
  activityId: number;
  latitude: string;
  longitude: string;
  signType: string; // "1": 签到, "2": 签退
  studentId: number;
}
