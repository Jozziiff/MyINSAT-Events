import { IsEnum } from 'class-validator';
import { RegistrationStatus } from '../../common/enums';

export class UpdateRegistrationStatusDto {
    @IsEnum(RegistrationStatus)
    status: RegistrationStatus;
}
